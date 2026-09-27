import React from "react";
import { useT } from "./i18n";
export default function Legal({ page }) {
  const T = useT();
  const privacy = page === "privacy";
  return (
    <article className="legal panel">
      <span className="eyebrow">IZLA · 26.09.2026</span>
      <h1>
        {privacy
          ? T("Конфиденциальность", "Maxfiylik", "Privacy")
          : T("Правила сервиса", "Xizmat qoidalari", "Terms of service")}
      </h1>
      <p className="notice">
        {T(
          "Предварительная редакция для пилотной версии. Данные юридического оператора и окончательные сроки хранения будут опубликованы до открытия регистрации.",
          "Sinov versiyasi uchun dastlabki tahrir. Operator ma’lumotlari va saqlash muddatlari ro‘yxatdan o‘tish ochilishidan oldin e’lon qilinadi.",
          "Draft for the pilot version. Operator details and final retention periods will be published before registration opens.",
        )}
      </p>
      {(privacy
        ? [
            [
              "Какие данные нужны",
              "Qanday ma’lumotlar kerak",
              "Data we use",
              "Имя, подтверждённый телефон и Telegram ID нужны для входа и связи. Описание услуг, сообщения, фотографии и история заказов — для исполнения заказов и разбора споров.",
              "Ism, tasdiqlangan telefon va Telegram ID kirish uchun kerak. Buyurtmalar, xabarlar va suratlar xizmat va nizolar uchun ishlatiladi.",
              "Name, verified phone and Telegram ID support sign-in. Orders, messages and photos support service delivery and dispute resolution.",
            ],
            [
              "Проверка личности",
              "Shaxsni tekshirish",
              "Identity checks",
              "MyID подключается как отдельный поставщик проверки. Ручная проверка включает документ с двух сторон и три снимка лица с отдельным согласием. Она не является проверкой MyID и не гарантирует подлинность документа. До подключения защищённого хранилища проверка недоступна.",
              "MyID alohida xizmat. Qo‘lda tekshirishda hujjatning ikki tomoni va yuzning uch surati alohida rozilik bilan olinadi. Bu MyID emas va hujjat haqiqiyligini kafolatlamaydi.",
              "MyID is a separate provider. Manual review uses both sides of an ID and three face photos with separate consent. It is not MyID and does not guarantee document authenticity. Collection remains disabled until secure storage is configured.",
            ],
            [
              "Геолокация",
              "Geolokatsiya",
              "Location",
              "Геопозиция курьера передаётся только с его разрешения во время активного заказа. Она доступна участникам заказа и администратору. При завершении заказа актуальная точка удаляется. Браузер может приостанавливать передачу при блокировке экрана.",
              "Kuryer joylashuvi uning ruxsati bilan faol buyurtmada uzatiladi. Faqat ishtirokchilar va administrator ko‘radi. Buyurtma tugagach nuqta o‘chiriladi.",
              "Courier location is shared with permission during active orders, with participants and administrators. The current point is deleted at completion. Browsers may pause updates when the screen is locked.",
            ],
            [
              "Защита и доступ",
              "Himoya va kirish",
              "Protection and access",
              "Фотографии шифруются при хранении и выдаются только участникам соответствующего заказа. Документы доступны только проверяющему администратору; просмотры записываются в журнал. Пароли бота и ключи интеграций не публикуются.",
              "Suratlar shifrlanadi va faqat buyurtma ishtirokchilariga beriladi. Hujjatlarni faqat administrator ko‘radi; ko‘rishlar qayd etiladi.",
              "Photos are encrypted at rest and restricted to order participants. Identity documents are restricted to reviewing administrators; access is logged. Integration secrets are not published.",
            ],
            [
              "Хранение и ваши права",
              "Saqlash va huquqlaringiz",
              "Retention and your rights",
              "Биометрические данные должны храниться в Узбекистане. Обычная база приложения и хранилище проверки личности разделены. Для запроса доступа, исправления, удаления данных или отзыва согласия обратитесь в поддержку. Данные, необходимые для незавершённого спора или исполнения закона, могут быть сохранены на соответствующем основании.",
              "Biometrik ma’lumotlar O‘zbekistonda saqlanishi kerak. Ma’lumotlarni ko‘rish, tuzatish, o‘chirish yoki rozilikni qaytarish uchun yordamga murojaat qiling.",
              "Biometric data must be stored in Uzbekistan. App and identity storage are separated. Contact support to request access, correction, deletion or withdrawal of consent. Records required for an active dispute or legal obligation may be retained on the relevant basis.",
            ],
            [
              "Cookies и внешние сервисы",
              "Cookies va tashqi xizmatlar",
              "Cookies and providers",
              "Используется cookie сессии для входа; язык и тема сохраняются на устройстве. Telegram используется для подтверждения телефона. При включённой карте Яндекс получает данные, необходимые для её отображения и маршрута. Рекламные трекеры не подключены.",
              "Kirish uchun sessiya cookie ishlatiladi. Til va mavzu qurilmada saqlanadi. Telefon Telegram orqali tasdiqlanadi. Xarita yoqilganda Yandex yo‘nalish ma’lumotlarini oladi.",
              "A session cookie supports sign-in; language and theme are stored locally. Telegram verifies your phone. When enabled, Yandex receives data needed for maps and routes. No advertising trackers are installed.",
            ],
          ]
        : [
            [
              "Что такое IZLA",
              "IZLA nima",
              "About IZLA",
              "IZLA помогает клиентам находить исполнителей законных услуг. Стоимость, состав работ, сроки и способ расчёта стороны согласовывают до начала. В пилотной версии платформа не принимает платежи и не предоставляет эскроу.",
              "IZLA mijozlarga qonuniy xizmat ijrochilarini topishga yordam beradi. Narx, ish hajmi, muddat va to‘lov oldindan kelishiladi. Sinov versiyada to‘lov va eskrou yo‘q.",
              "IZLA connects clients and providers of lawful services. Agree on scope, price, deadlines and payment before work starts. The pilot does not process payments or offer escrow.",
            ],
            [
              "Аккаунт и ответственность",
              "Hisob va javobgarlik",
              "Account and responsibility",
              "Сервис предназначен для совершеннолетних пользователей. Указывайте свой номер и достоверные данные. Нельзя передавать аккаунт, выдавать себя за другого человека, публиковать чужие документы или обходить проверку.",
              "Xizmat voyaga yetganlar uchun. O‘z raqamingiz va to‘g‘ri ma’lumotlarni kiriting. Hisobni berish, boshqa shaxs nomidan foydalanish va tekshiruvni chetlab o‘tish taqiqlanadi.",
              "The service is for adults. Use your own phone and accurate information. Account sharing, impersonation, other people’s documents and bypassing checks are prohibited.",
            ],
            [
              "Какие услуги запрещены",
              "Taqiqlangan xizmatlar",
              "Prohibited services",
              "Запрещены незаконные услуги и перевозка запрещённых предметов, мошенничество, угрозы, эксплуатация людей и нарушение прав третьих лиц. Для лицензируемой деятельности исполнитель обязан иметь необходимые разрешения. Не передавайте опасные вещества, оружие и незаконные товары.",
              "Noqonuniy xizmatlar, taqiqlangan buyumlar, firibgarlik, tahdid va boshqalarning huquqlarini buzish taqiqlanadi. Litsenziyali faoliyat uchun tegishli ruxsatlar kerak.",
              "Unlawful services, prohibited goods, fraud, threats, exploitation and violations of others’ rights are prohibited. Providers must hold required licenses. Do not hand over dangerous substances, weapons or illegal goods.",
            ],
            [
              "Передача и выполнение",
              "Topshirish va bajarish",
              "Handover and completion",
              "Опишите задачу и приложите фото до создания заявки. Для доставки укажите содержимое, адреса и получателя. Исполнитель фиксирует получение и результат фотографиями. Подтверждайте только фактически выполненные действия. Не фотографируйте посторонних без основания.",
              "Vazifani yozing va oldindan surat qo‘shing. Yetkazishda tarkib, manzillar va oluvchini kiriting. Ijrochi qabul va natijani surat bilan qayd etadi. Faqat haqiqiy harakatlarni tasdiqlang.",
              "Describe the task and attach a photo before posting. Delivery requires contents, addresses and recipient details. Providers document collection and results with photos. Confirm only actions that happened. Avoid photographing unrelated people.",
            ],
            [
              "Отзывы, отмены и споры",
              "Sharhlar va nizolar",
              "Reviews, cancellations and disputes",
              "Отзыв о выполнении доступен клиенту после завершения заказа. Не публикуйте персональные данные, оскорбления и вымышленные отзывы. До назначения исполнителя заказ можно отменить. После назначения проблему передайте в спор. Администратор изучает переписку, фото и историю, фиксирует решение; денежные возвраты автоматически не выполняются.",
              "Bajarilgan buyurtmaga mijoz sharh qoldiradi. Shaxsiy ma’lumot, haqorat va soxta sharhlar taqiqlanadi. Ijrochi tayinlanguncha bekor qilish mumkin. Keyin nizo ochiladi; pul avtomatik qaytarilmaydi.",
              "Clients may review completed orders. Do not post private data, abuse or fake reviews. Cancel before assignment; afterwards open a dispute. Administrators review evidence and record a decision. Monetary refunds are not automated.",
            ],
            [
              "Ограничения и обращения",
              "Cheklovlar va murojaatlar",
              "Restrictions and appeals",
              "При нарушениях модератор может скрыть объявление или ограничить аккаунт с фиксацией причины. Решение можно обжаловать через поддержку. В экстренной ситуации обращайтесь в соответствующие экстренные службы, а не ожидайте ответа чата.",
              "Qoidabuzarlikda e’lon yoki hisob sabab ko‘rsatilgan holda cheklanadi. Qaror yuzasidan yordamga murojaat qilish mumkin. Favqulodda holatda tegishli xizmatga qo‘ng‘iroq qiling.",
              "Moderators may hide listings or restrict accounts with a recorded reason. Contact support to appeal. In emergencies contact emergency services rather than waiting for chat support.",
            ],
          ]
      ).map((s, i) => (
        <section key={i}>
          <h2>
            {i + 1}. {T(...s.slice(0, 3))}
          </h2>
          <p>{T(...s.slice(3))}</p>
        </section>
      ))}
      <h2>{T("Поддержка", "Yordam", "Support")}</h2>
      <p>
        <a href="tel:+998200309100">+998 20 030 91 00</a>
        <br />
        <a href="mailto:anvarikromov778@gmail.com">anvarikromov778@gmail.com</a>
        <br />
        <a href="https://t.me/i0000001i" target="_blank" rel="noreferrer">
          @i0000001i
        </a>
      </p>
    </article>
  );
}
