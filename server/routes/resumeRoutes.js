import { Router } from 'express'

import {
  deleteResume,
  getResume,
  listResumes,
  uploadResume,
} from '../controllers/resumeController.js'
import { protect } from '../middlewares/authMiddleware.js'
import { resumeUpload } from '../middlewares/uploadMiddleware.js'

const router = Router()

router.use(protect)

router.post('/', resumeUpload, uploadResume)
router.get('/', listResumes)
router.get('/:id', getResume)
router.delete('/:id', deleteResume)

export default router
