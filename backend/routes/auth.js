import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateRegistration, validateLogin } from '../middleware/validateAuth.js';

const router = express.Router();

router.post('/register', protect, authorize('admin'), validateRegistration, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);

export default router;
