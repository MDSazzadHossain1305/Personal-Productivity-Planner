import { Router } from 'express';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// placeholder: the owner of this feature replaces this whole file in their own step
export default router;
