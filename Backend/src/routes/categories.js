import express from 'express';

const router = express.Router();

router.get('/categories', getCategories);

export default router;