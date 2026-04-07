import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlineShoppingCart,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCurrencyDollar,
} from "react-icons/hi";

export default function Purchases() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const [ordersSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "products")),
    ]);

    return {
      orders: ordersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.status === "approved" || o.status === "completed")
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return dateB - dateA;
        }),
      products: productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  }

  async function refreshData() {
    try {
      const data = await fetchData();
      setOrders(data.orders);
      setProducts(data.products);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ في جلب البيانات");
    }
    setLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await fetchData();
        if (!isMounted) return;
        setOrders(data.orders);
        setProducts(data.products);
      } catch (error) {
        console.error(error);
        toast.error("حدث خطأ في جلب البيانات");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () =>
