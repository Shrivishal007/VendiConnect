import express from 'express';

const router = express.Router();

router.post('/', createAlert);

export default router;