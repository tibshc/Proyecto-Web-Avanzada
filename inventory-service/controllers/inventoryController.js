const Part = require('../models/Part');

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

module.exports = {
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart
};
