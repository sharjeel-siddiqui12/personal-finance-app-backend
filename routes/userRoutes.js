import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateProfile,
  changePassword,
  deleteUser,
  updateRole,
  getProfile
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public routes
// None

// Protected routes
router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.put('/password', protect, changePassword);

// Admin routes
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.get('/:id', protect, authorize('ADMIN'), getUserById);
router.delete('/:id', protect, authorize('ADMIN'), deleteUser);
router.put('/:id/role', protect, authorize('ADMIN'), updateRole);

export default router;