const express = require('express');
const router = express.Router();
const {
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart
} = require('../controllers/inventoryController');

// Todas estas rutas estarán protegidas por el API Gateway,
// por lo que este microservicio asume que la petición ya está validada.

router.get('/', getAllParts);
router.get('/:id', getPartById);
router.post('/', createPart);
router.put('/:id', updatePart);
router.delete('/:id', deletePart);

module.exports = router;
