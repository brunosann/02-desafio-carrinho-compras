import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartItems = [...cart]
      const verifIndex = cartItems.findIndex(item => item.id === productId)

      if (verifIndex === -1) {
        const {data} = await api.get(`/products/${productId}`)
        cartItems.push({...data, amount: 1})
        setCart(cartItems)
        return localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartItems))
      } 

      const cartItemAmount = cartItems[verifIndex].amount + 1
      const {data : stockItem} = await api.get(`/stock/${productId}`)
      if (cartItemAmount > stockItem.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      cartItems[verifIndex].amount = cartItemAmount
      setCart(cartItems)
      return localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartItems))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartProducts = [...cart]
      const indexProduct = cartProducts.findIndex(product => product.id === productId)
      if (indexProduct === -1) throw new Error('product not exist')
      cartProducts.splice(indexProduct, 1)
      setCart(cartProducts)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartProducts))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return
      const {data: stockProduct} = await api.get(`stock/${productId}`)
      if (amount > stockProduct.amount) return toast.error('Quantidade solicitada fora de estoque');
      setCart(oldsProducts => {
        const changedProducts = oldsProducts.map(product => {
          if (product.id === productId) product.amount = amount
          return product
        })
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(changedProducts))
        return changedProducts
      })
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
