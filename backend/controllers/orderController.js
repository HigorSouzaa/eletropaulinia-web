import Order from '../models/Order.js';

// @desc    Obter todas as ordens
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ dataEntrada: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obter uma ordem por ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Ordem não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Criar nova ordem
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      cliente,
      telefone,
      equipamento,
      marca,
      numeroSerie,
      defeito,
      status,
      dataEntrada,
      dataPrevista,
      tecnico,
      observacoes
    } = req.body;

    const order = await Order.create({
      cliente,
      telefone,
      equipamento,
      marca,
      numeroSerie,
      defeito,
      status: status || 'Aguardando',
      dataEntrada,
      dataPrevista,
      tecnico,
      observacoes,
      createdBy: req.user._id
    });

    res.status(201).json(order);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Número de ordem já existe' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// @desc    Atualizar ordem
// @route   PUT /api/orders/:id
// @access  Private
export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.numero = req.body.numero || order.numero;
      order.cliente = req.body.cliente || order.cliente;
      order.telefone = req.body.telefone || order.telefone;
      order.equipamento = req.body.equipamento || order.equipamento;
      order.marca = req.body.marca || order.marca;
      order.numeroSerie = req.body.numeroSerie || order.numeroSerie;
      order.defeito = req.body.defeito || order.defeito;
      order.status = req.body.status || order.status;
      order.dataEntrada = req.body.dataEntrada || order.dataEntrada;
      order.dataPrevista = req.body.dataPrevista || order.dataPrevista;
      order.tecnico = req.body.tecnico || order.tecnico;
      order.observacoes = req.body.observacoes || order.observacoes;

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Ordem não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deletar ordem
// @route   DELETE /api/orders/:id
// @access  Private (Admin only)
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      await order.deleteOne();
      res.json({ message: 'Ordem removida' });
    } else {
      res.status(404).json({ message: 'Ordem não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Atualizar apenas o status da ordem
// @route   PATCH /api/orders/:id/status
// @access  Private
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = status;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Ordem não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
