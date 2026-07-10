import { Router } from 'express';
import * as ctrl from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.post('/register',       authLimiter, ctrl.register);
router.post('/login',          authLimiter, ctrl.login);
router.post('/refresh',        ctrl.refresh);
router.post('/logout',         authenticate, ctrl.logout);
router.get( '/verify/:token',  ctrl.verifyEmail);
router.post('/reset-request',  authLimiter, ctrl.requestReset);
router.post('/reset-password', authLimiter, ctrl.resetPassword);
router.get( '/me',             authenticate, ctrl.me);
router.patch('/profile',        authenticate, ctrl.updateProfile);
router.post('/change-password', authenticate, ctrl.changePassword);

export default router;
