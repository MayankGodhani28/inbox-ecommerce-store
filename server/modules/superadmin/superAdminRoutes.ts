import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db/prisma.js';
import { Role, SellerStatus } from '@prisma/client';
import {
  createSession,
  requireAuth,
  requireSuperAdmin,
  optionalAuth,
  AuthenticatedRequest,
} from '../../middleware/auth.js';

export const superAdminRouter = Router();

// ==========================================
// 1. PUBLIC SELLER ONBOARDING ENDPOINTS
// ==========================================

// POST /api/super-admin/seller-apply - Apply to become a marketplace seller / admin
superAdminRouter.post('/seller-apply', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    name,
    storeName,
    legalName,
    email,
    phone,
    businessAddress,
    category,
    taxId,
    description,
    password, // optional if creating account simultaneously
  } = req.body;

  if (!storeName || typeof storeName !== 'string' || storeName.trim().length === 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Store Name is required' } });
    return;
  }

  const cleanEmail = req.user?.email.toLowerCase() || (typeof email === 'string' ? email.trim().toLowerCase() : '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'A valid business email address is required' } });
    return;
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Business phone number is required' } });
    return;
  }

  if (!businessAddress || typeof businessAddress !== 'string' || businessAddress.trim().length === 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Business warehouse or operating address is required' } });
    return;
  }

  // Check if there's already a pending application for this email
  const existingApp = await prisma.sellerApplication.findFirst({
    where: { email: cleanEmail, status: SellerStatus.PENDING },
  });

  if (existingApp) {
    res.status(409).json({
      error: {
        code: 'APPLICATION_PENDING',
        message: 'An application for this store email is already under review by our Super Admin team.',
      },
    });
    return;
  }

  let linkedUserId = req.user?.id;
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingUser && existingUser.id !== req.user?.id) {
    if (typeof password !== 'string' || !(await bcrypt.compare(password, existingUser.passwordHash))) {
      res.status(403).json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to the existing account before applying.' } });
      return;
    }
    linkedUserId = existingUser.id;
  } else if (!existingUser) {
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters and at most 72 UTF-8 bytes.' } });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const applicantPersonName =
      (typeof name === 'string' && name.trim()) ||
      (typeof req.user?.name === 'string' && req.user.name.trim()) ||
      (cleanEmail ? cleanEmail.split('@')[0] : '') ||
      'Merchant';

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: applicantPersonName,
        phone: phone.trim(),
        passwordHash,
        role: Role.CUSTOMER,
        sellerStatus: SellerStatus.PENDING,
        storeName: storeName.trim(),
      },
    });
    linkedUserId = newUser.id;
  }

  const application = await prisma.sellerApplication.create({
    data: {
      userId: linkedUserId || null,
      storeName: storeName.trim(),
      legalName: typeof legalName === 'string' && legalName.trim() ? legalName.trim() : storeName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      businessAddress: businessAddress.trim(),
      category: typeof category === 'string' && category.trim() ? category.trim() : 'Electronics',
      taxId: taxId ? String(taxId).trim() : null,
      description: description ? String(description).trim() : null,
      status: SellerStatus.PENDING,
    },
  });

  if (linkedUserId) {
    await prisma.user.update({
      where: { id: linkedUserId },
      data: {
        sellerStatus: SellerStatus.PENDING,
        storeName: storeName.trim(),
      },
    });
  }

  if (!req.user && linkedUserId) await createSession(linkedUserId, res);

  res.status(201).json({
    data: {
      message: 'Seller application submitted successfully! It is now queued for Super Admin verification.',
      application,
      applicationId: application.id,
      status: application.status,
    },
  });
});

// GET /api/super-admin/my-application - Check status of current seller application
superAdminRouter.get('/my-application', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const application = await prisma.sellerApplication.findFirst({
    where: { userId: req.user!.id, email: req.user!.email },
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json({ data: { application } });
});

// ==========================================
// 2. RESTRICTED SUPER ADMIN CONSOLE ENDPOINTS
// ==========================================

// Apply Super Admin Gate to all subsequent routes
superAdminRouter.use(requireAuth);
superAdminRouter.use(requireSuperAdmin);

// GET /api/super-admin/metrics - Overall administrative summary
superAdminRouter.get('/metrics', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const [totalAdmins, totalCustomers, pendingApplications, approvedApplications, rejectedApplications] =
    await Promise.all([
      prisma.user.count({ where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } } }),
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.sellerApplication.count({ where: { status: SellerStatus.PENDING } }),
      prisma.sellerApplication.count({ where: { status: SellerStatus.APPROVED } }),
      prisma.sellerApplication.count({ where: { status: SellerStatus.REJECTED } }),
    ]);

  res.status(200).json({
    data: {
      metrics: {
        totalAdmins,
        totalCustomers,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
      },
    },
  });
});

// GET /api/super-admin/applications - List all seller applications
superAdminRouter.get('/applications', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status } = req.query;
  const where: any = {};

  if (status && typeof status === 'string' && status !== 'all') {
    const normalizedStatus = status.toUpperCase();
    if (!Object.values(SellerStatus).includes(normalizedStatus as SellerStatus)) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid application status' } });
      return;
    }
    where.status = normalizedStatus as SellerStatus;
  }

  const applications = await prisma.sellerApplication.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: { applications } });
});

// PATCH /api/super-admin/applications/:id/approve - Approve seller application & promote to ADMIN
superAdminRouter.patch('/applications/:id/approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const application = await prisma.sellerApplication.findUnique({ where: { id } });
  if (!application) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    return;
  }

  const applicant = await prisma.user.findUnique({ where: { email: application.email } });
  if (!applicant || applicant.id !== application.userId) {
    res.status(400).json({ error: { code: 'UNVERIFIED_APPLICANT', message: 'The applicant must sign in and resubmit before approval.' } });
    return;
  }

  const updatedApp = await prisma.$transaction(async (tx) => {
    // 1. Update application status
    const app = await tx.sellerApplication.update({
      where: { id },
      data: {
        status: SellerStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: req.user!.name || req.user!.email,
      },
    });

    // 2. Promote or create user with role ADMIN
    const existingUser = await tx.user.findUnique({ where: { email: application.email } });
    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          role: existingUser.role === Role.SUPER_ADMIN ? Role.SUPER_ADMIN : Role.ADMIN,
          sellerStatus: SellerStatus.APPROVED,
          storeName: application.storeName,
        },
      });
    } else {
      throw new Error('Applicant account no longer exists');
    }

    return app;
  });

  res.status(200).json({
    data: {
      message: `Seller "${application.storeName}" has been approved! Store admin access has been granted.`,
      application: updatedApp,
    },
  });
});

// PATCH /api/super-admin/applications/:id/reject - Reject seller application
superAdminRouter.patch('/applications/:id/reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  const application = await prisma.sellerApplication.findUnique({ where: { id } });
  if (!application) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    return;
  }

  const updatedApp = await prisma.sellerApplication.update({
    where: { id },
    data: {
      status: SellerStatus.REJECTED,
      rejectionReason: reason || 'Business documentation or requirements could not be verified at this time.',
      reviewedAt: new Date(),
      reviewedBy: req.user!.name || req.user!.email,
    },
  });

  // Update user record if exists
  await prisma.user.updateMany({
    where: { email: application.email },
    data: { sellerStatus: SellerStatus.REJECTED },
  });

  res.status(200).json({
    data: {
      message: `Seller application for "${application.storeName}" has been rejected.`,
      application: updatedApp,
    },
  });
});

// PATCH /api/super-admin/applications/:id/suspend - Suspend verified seller store
superAdminRouter.patch('/applications/:id/suspend', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const application = await prisma.sellerApplication.findUnique({ where: { id } });
  if (!application) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.sellerApplication.update({
      where: { id },
      data: { status: SellerStatus.SUSPENDED },
    });
    const user = await tx.user.findUnique({ where: { email: application.email } });
    if (user) {
      await tx.user.update({
        where: { id: user.id },
        data: { sellerStatus: SellerStatus.SUSPENDED },
      });
      await tx.product.updateMany({
        where: {
          OR: [
            { specifications: { path: ['sellerEmail'], equals: user.email } },
            { specifications: { path: ['sellerId'], equals: user.id } },
          ],
        },
        data: { isArchived: true },
      });
    }
  });

  res.status(200).json({ data: { message: `Seller "${application.storeName}" has been suspended.` } });
});

// PATCH /api/super-admin/applications/:id/unsuspend - Reinstate suspended seller store
superAdminRouter.patch('/applications/:id/unsuspend', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const application = await prisma.sellerApplication.findUnique({ where: { id } });
  if (!application) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.sellerApplication.update({
      where: { id },
      data: { status: SellerStatus.APPROVED },
    });
    const user = await tx.user.findUnique({ where: { email: application.email } });
    if (user) {
      await tx.user.update({
        where: { id: user.id },
        data: { sellerStatus: SellerStatus.APPROVED, role: Role.ADMIN },
      });
      await tx.product.updateMany({
        where: {
          OR: [
            { specifications: { path: ['sellerEmail'], equals: user.email } },
            { specifications: { path: ['sellerId'], equals: user.id } },
          ],
        },
        data: { isArchived: false },
      });
    }
  });

  res.status(200).json({ data: { message: `Seller "${application.storeName}" has been reinstated!` } });
});

// GET /api/super-admin/admins - Directory of all platform administrators & sellers
superAdminRouter.get('/admins', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const admins = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      storeName: true,
      sellerStatus: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone || 'N/A',
    role: a.role === Role.SUPER_ADMIN ? 'superadmin' : 'admin',
    storeName: a.storeName || (a.role === Role.SUPER_ADMIN ? 'Platform Headquarters' : 'Official Store'),
    sellerStatus: a.sellerStatus || 'APPROVED',
    createdAt: a.createdAt.toISOString(),
  }));

  res.status(200).json({ data: { admins: formatted } });
});

// PATCH /api/super-admin/admins/:id/status - Toggle suspension or role of admin
superAdminRouter.patch('/admins/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, sellerStatus, role } = req.body;
  const targetSellerStatus = (sellerStatus || status) as SellerStatus | undefined;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  // Prevent self-demotion
  if (user.id === req.user!.id) {
    res.status(400).json({ error: { code: 'CANNOT_MODIFY_SELF', message: 'You cannot alter your own Super Admin access.' } });
    return;
  }

  if ((targetSellerStatus && !Object.values(SellerStatus).includes(targetSellerStatus))
    || (role && !['superadmin', 'admin', 'customer'].includes(role))) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid role or seller status' } });
    return;
  }

  const updates: any = {};
  if (targetSellerStatus) {
    updates.sellerStatus = targetSellerStatus;
  }
  if (role) {
    if (role === 'superadmin') updates.role = Role.SUPER_ADMIN;
    else if (role === 'admin') updates.role = Role.ADMIN;
    else if (role === 'customer') updates.role = Role.CUSTOMER;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: updates,
    });

    if (targetSellerStatus) {
      // Sync seller application status
      await tx.sellerApplication.updateMany({
        where: { email: user.email },
        data: { status: targetSellerStatus },
      });

      // If suspended: archive products to pause public storefront visibility
      // If approved/reinstated: unarchive products so storefront shows them again
      const shouldArchive = targetSellerStatus === SellerStatus.SUSPENDED;
      await tx.product.updateMany({
        where: {
          OR: [
            { specifications: { path: ['sellerEmail'], equals: user.email } },
            { specifications: { path: ['sellerId'], equals: user.id } },
          ],
        },
        data: { isArchived: shouldArchive },
      });
    }

    return u;
  });

  res.status(200).json({
    data: {
      message: targetSellerStatus === SellerStatus.SUSPENDED
        ? `Seller ${updated.name} has been suspended. Store items are paused.`
        : `Seller ${updated.name} has been reinstated. Store items are active.`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        sellerStatus: updated.sellerStatus,
      },
    },
  });
});
