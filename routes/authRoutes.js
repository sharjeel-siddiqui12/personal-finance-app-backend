import express from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  getCurrentUser, 
  logout 
} from '../controllers/AuthController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);

export default router;