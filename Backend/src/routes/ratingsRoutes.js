import express from 'express';

const router = express.Router();

router.post('/', requireResidentAuth, attachResident, createRating);

export default router;