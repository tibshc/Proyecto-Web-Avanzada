const express = require('express');
const router = express.Router();
const {
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  reserveStock,
  releaseStock
} = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Todas estas rutas estarán protegidas por el API Gateway,
// por lo que este microservicio asume que la petición ya está validada.

router.use(authenticate);
router.get('/', getAllParts);
router.get('/:id', getPartById);
router.post('/', authorize('admin', 'support'), createPart);
router.put('/:id', authorize('admin', 'support'), updatePart);
router.delete('/:id', authorize('admin'), deletePart);
router.post('/:id/reserve', reserveStock);
router.post('/:id/release', releaseStock);

module.exports = router;
