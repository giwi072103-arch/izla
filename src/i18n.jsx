import { createContext, useContext } from "react";
export const Language = createContext("ru");
export function useT() {
  const lang = useContext(Language);
  return (ru, uz, en) => ({ ru, uz: uz || ru, en: en || ru })[lang];
}
export const categoryNames = {
  delivery: ["Доставка", "Yetkazib berish", "Delivery"],
  repair: ["Ремонт и мастер", "Ta’mirlash", "Home repairs"],
  cleaning: ["Уборка", "Tozalash", "Cleaning"],
  beauty: ["Красота и уход", "Go‘zallik", "Beauty"],
  education: ["Обучение", "Ta’lim", "Education"],
  digital: ["IT и дизайн", "IT va dizayn", "IT & design"],
  auto: ["Автоуслуги", "Avtoxizmatlar", "Auto services"],
  other: ["Другие услуги", "Boshqa xizmatlar", "Other services"],
};
export const statusNames = {
  open: ["Поиск исполнителя", "Ijrochi qidirilmoqda", "Finding a specialist"],
  assigned: ["Исполнитель назначен", "Ijrochi tayinlandi", "Assigned"],
  in_progress: ["В процессе", "Jarayonda", "In progress"],
  awaiting_confirmation: [
    "Ждёт подтверждения",
    "Tasdiqlash kutilmoqda",
    "Awaiting confirmation",
  ],
  completed: ["Завершён", "Bajarildi", "Completed"],
  cancelled: ["Отменён", "Bekor qilindi", "Cancelled"],
  disputed: ["Открыт спор", "Nizo ochildi", "Disputed"],
};
