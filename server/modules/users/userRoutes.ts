import { Router, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';

export const userRouter = Router();

userRouter.use(requireAuth);

function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || '',
    avatar: user.avatarUrl || '',
    role: user.role === 'SUPER_ADMIN' ? 'superadmin' : user.role === 'ADMIN' ? 'admin' : 'customer',
    addresses: user.addresses || [],
    createdAt: user.createdAt.toISOString(),
  };
}

// GET /api/me - Get current user profile and addresses
userRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] } },
  });

  if (!user) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  res.status(200).json({ data: { user: sanitizeUser(user) } });
});

// PATCH /api/me - Update allowlisted profile fields (name, phone, avatarUrl)
userRouter.patch('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, phone, avatarUrl } = req.body;
  const updates: Record<string, any> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Name cannot be empty' } });
      return;
    }
    updates.name = name.trim();
  }

  if (phone !== undefined) {
    updates.phone = typeof phone === 'string' ? phone.trim() : null;
  }

  if (avatarUrl !== undefined) {
    updates.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : null;
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: updates,
    include: { addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] } },
  });

  res.status(200).json({ data: { user: sanitizeUser(updatedUser) } });
});

// GET /api/me/addresses - Get all addresses for current user
userRouter.get('/addresses', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({ data: { addresses } });
});

// POST /api/me/addresses - Add new address
userRouter.post('/addresses', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { fullName, phone, street, city, state, pincode, country, type, isDefault } = req.body;

  if (!fullName || !street || !city || !state || !pincode) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Full name, street, city, state, and pincode are required' },
    });
    return;
  }

  const addressCount = await prisma.address.count({ where: { userId: req.user!.id } });
  const shouldBeDefault = isDefault === true || addressCount === 0;

  const createdAddress = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId: req.user!.id,
        fullName: fullName.trim(),
        phone: (phone || req.user!.phone || '').trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: (country || 'India').trim(),
        type: (type || 'Home').trim(),
        isDefault: shouldBeDefault,
      },
    });
  });

  res.status(201).json({ data: { address: createdAddress } });
});

// PATCH /api/me/addresses/:id - Update existing address
userRouter.patch('/addresses/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const addressId = req.params.id;
  const existing = await prisma.address.findUnique({ where: { id: addressId } });

  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Address not found' } });
    return;
  }

  const { fullName, phone, street, city, state, pincode, country, type, isDefault } = req.body;
  const updates: Record<string, any> = {};

  if (fullName !== undefined) updates.fullName = fullName.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (street !== undefined) updates.street = street.trim();
  if (city !== undefined) updates.city = city.trim();
  if (state !== undefined) updates.state = state.trim();
  if (pincode !== undefined) updates.pincode = pincode.trim();
  if (country !== undefined) updates.country = country.trim();
  if (type !== undefined) updates.type = type.trim();

  const updatedAddress = await prisma.$transaction(async (tx) => {
    if (isDefault === true) {
      await tx.address.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
      updates.isDefault = true;
    }

    return tx.address.update({
      where: { id: addressId },
      data: updates,
    });
  });

  res.status(200).json({ data: { address: updatedAddress } });
});

// PATCH /api/me/addresses/:id/default - Set address as default
userRouter.patch('/addresses/:id/default', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const addressId = req.params.id;
  const existing = await prisma.address.findUnique({ where: { id: addressId } });

  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Address not found' } });
    return;
  }

  const updatedAddress = await prisma.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId: req.user!.id, isDefault: true },
      data: { isDefault: false },
    });

    return tx.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  });

  res.status(200).json({ data: { address: updatedAddress } });
});

// DELETE /api/me/addresses/:id - Delete address and preserve single default if needed
userRouter.delete('/addresses/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const addressId = req.params.id;
  const existing = await prisma.address.findUnique({ where: { id: addressId } });

  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Address not found' } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });

    // If the deleted address was default, promote the newest remaining address to default
    if (existing.isDefault) {
      const nextDefault = await tx.address.findFirst({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      });
      if (nextDefault) {
        await tx.address.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }
  });

  res.status(200).json({ data: { message: 'Address deleted successfully' } });
});
