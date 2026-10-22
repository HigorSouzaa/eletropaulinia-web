import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { isAxiosError } from 'axios';

export type OrderStatus = 'Aguardando' | 'Em andamento' | 'Pronto' | 'Entregue';

export interface Order {
  _id: string;
  numero: string;
  cliente: string;
  telefone: string;
  equipamento: string;
  marca: string;
  numeroSerie?: string;
  defeito: string;
  dataEntrada: string;
  dataPrevista?: string;
  tecnico?: string;
  observacoes?: string;
  status: OrderStatus;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, '_id' | 'numero'>) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  getOrder: (id: string) => Order | undefined;
  fetchOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    // Só busca se tiver token (usuário logado)
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error: unknown) {
      console.error('Erro ao carregar ordens:', error);
      // Se der erro 401, limpa as ordens
      if (isAxiosError(error) && error.response?.status === 401) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const addOrder = async (orderData: Omit<Order, '_id' | 'numero'>) => {
    try {
      const response = await api.post('/orders', orderData);
      setOrders(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Erro ao criar ordem:', error);
      throw error;
    }
  };

  const updateOrder = async (id: string, orderData: Partial<Order>) => {
    try {
      const response = await api.put(`/orders/${id}`, orderData);
      setOrders(prev => prev.map(order =>
        order._id === id ? response.data : order
      ));
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const response = await api.patch(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(order =>
        order._id === id ? response.data : order
      ));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  };

  const getOrder = (id: string) => {
    return orders.find(order => order._id === id);
  };

  return (
    <OrderContext.Provider value={{ 
      orders, 
      loading, 
      addOrder, 
      updateOrder, 
      updateOrderStatus, 
      getOrder,
      fetchOrders 
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
