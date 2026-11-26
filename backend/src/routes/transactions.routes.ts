import { Router } from 'express';
import { createTransaction, deleteTransaction, getTransaction, listTransactions, updateTransaction } from '../controllers/transactions.controller.js';
import { authenticate, validateTransactionId } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.get('/', listTransactions);
router.post('/', createTransaction);
router.get('/:id', validateTransactionId, getTransaction);
router.patch('/:id', validateTransactionId, updateTransaction);
router.delete('/:id', validateTransactionId, deleteTransaction);

export default router;
