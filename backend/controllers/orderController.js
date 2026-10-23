import Order from '../models/Order.js';

// @desc    Obter todas as ordens
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ dataEntrada: -1 });
    if (orders.some(order => order.get('schemaVersion') === 2)) {
      return res.status(409).json({ message: 'Atualize o cliente para a API v2', code: 'CLIENT_UPGRADE_REQUIRED' });
    }
    res.json(orders);
  } catch {
    res.status(503).json({ message: 'Não foi possível consultar as ordens' });
  }
};

// @desc    Obter uma ordem por ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Identificador inválido' });
  try {
    const order = await Order.findById(req.params.id);

    if (order?.get('schemaVersion') === 2) return res.status(409).json({ message: 'Atualize o cliente para a API v2', code: 'CLIENT_UPGRADE_REQUIRED' });

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Ordem não encontrada' });
    }
  } catch {
    res.status(503).json({ message: 'Não foi possível consultar as ordens' });
  }
};
