const Part = require('../models/Part');
const { sequelize } = require('../config/db');

const getAllParts = async (req, res) => {
  try {
    const parts = await Part.findAll();
    res.json(parts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getPartById = async (req, res) => {
  try {
    const part = await Part.findByPk(req.params.id);
    if (!part) return res.status(404).json({ message: 'Part not found' });
    res.json(part);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const createPart = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const part = await Part.create({ name, description, price, stock });
    res.status(201).json(part);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const updatePart = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const part = await Part.findByPk(req.params.id);
    if (!part) return res.status(404).json({ message: 'Part not found' });

    part.name = name || part.name;
    part.description = description || part.description;
    part.price = price !== undefined ? price : part.price;
    part.stock = stock !== undefined ? stock : part.stock;

    await part.save();
    res.json(part);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const deletePart = async (req, res) => {
  try {
    const part = await Part.findByPk(req.params.id);
    if (!part) return res.status(404).json({ message: 'Part not found' });
    await part.destroy();
    res.json({ message: 'Part deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const reserveStock = async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'Quantity must be a positive integer' });
  }

  const transaction = await sequelize.transaction();
  try {
    const part = await Part.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!part) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Part not found' });
    }
    if (part.stock < quantity) {
      await transaction.rollback();
      return res.status(409).json({ message: 'Insufficient stock' });
    }
    part.stock -= quantity;
    await part.save({ transaction });
    await transaction.commit();
    res.json({ partId: part.id, quantity, remainingStock: part.stock });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Unable to reserve stock' });
  }
};

const releaseStock = async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: 'Quantity must be a positive integer' });
  }
  const part = await Part.findByPk(req.params.id);
  if (!part) return res.status(404).json({ message: 'Part not found' });
  part.stock += quantity;
  await part.save();
  res.json({ partId: part.id, quantity, stock: part.stock });
};

module.exports = {
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  reserveStock,
  releaseStock
};
