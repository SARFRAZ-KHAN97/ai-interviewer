import { Router } from 'express'

import { getReport } from '../controllers/reportController.js'
import { protect } from '../middlewares/authMiddleware.js'

const router = Router()

router.use(protect)

router.get('/:id', getReport)

export default router
