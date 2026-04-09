import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePrinter,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Receipts() {
  const { isAdmin } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(null);

  async function fetchData() {
    const receiptsSnap = await getDocs(collection(db, "receipts"));

    return {
      receipts: receiptsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    };
  }

  async function refreshData() {
    try {
      const data = await fetchData();
      setReceipts(data.receipts);
    } catch (e) {
      console.error(e);
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
        setReceipts(data.receipts);
      } catch (e) {
        console.error(e);
        toast.error("حدث خطأ في جلب البيانات");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteReceipt = async (receipt) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الفاتورة رقم "${receipt.receiptNumber}"؟`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "receipts", receipt.id));

      if (receipt.orderId) {
        await updateDoc(doc(db, "orders", receipt.orderId), {
          status: "approved",
        });
      }

      if (showReceipt?.id === receipt.id) {
        setShowReceipt(null);
      }

      toast.success("تم حذف الفاتورة بنجاح");
      await refreshData();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء حذف الفاتورة");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const buildReceiptCardHtml = (receipt) => {
    const grandTotal = (receipt.items || []).reduce(
      (s, i) => s + (i.salePrice || 0) * i.quantity,
      0
    );
