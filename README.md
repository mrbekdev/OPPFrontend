# Rental Arenda Application

Bu ilova ijara xizmatlari uchun yaratilgan full-stack dastur hisoblanadi.

## Backend (OPProject)

### O'rnatish

```bash
cd OPProject
npm install
```

### Ma'lumotlar bazasini sozlash

```bash
npx prisma generate
npx prisma db push
npm run seed
```

**Test foydalanuvchi ma'lumotlari:**

- Login: `admin`
- Parol: `password123`

**Eslatma:** Backend ni ishga tushirishdan oldin ma'lumotlar bazasini sozlashni unutmang!

### Backend ni ishga tushirish

```bash
npm run start:dev
```

Backend http://localhost:3000 da ishga tushadi.

## Frontend

### O'rnatish

```bash
npm install
```

### Frontend ni ishga tushirish

```bash
npm run dev
```

Frontend http://localhost:5173 da ishga tushadi.

## Asosiy funksiyalar

1. **Foydalanuvchi autentifikatsiyasi** - Login/logout
2. **Profil boshqaruvi** - Foydalanuvchi ma'lumotlarini tahrirlash
3. **Ijara boshqaruvi** - Mahsulotlarni ijaraga berish
4. **Qaytarish boshqaruvi** - Ijara qilingan mahsulotlarni qaytarish
5. **Inventarizatsiya** - Mahsulotlar ro'yxatini boshqarish va har bir mahsulot uchun ijara hisoboti
6. **Mijozlar boshqaruvi** - Mijozlar ro'yxatini boshqarish
7. **Hisobotlar** - Umumiy ijara hisobotlari

### Yangi funksiyalar:

- **Mahsulot hisoboti** - Har bir mahsulot uchun alohida ijara hisoboti
- **Modal ko'rinish** - Hisobot modal oynada ko'rsatiladi
- **Qaytarish funksiyasi** - Modal ichida to'g'ridan-to'g'ri qaytarish
- **Avtomatik stok yangilash** - Qaytarishda mahsulot soni avtomatik ko'payadi

## Token boshqaruvi

- Token 3 soatdan keyin avtomatik tozalanadi
- Foydalanuvchi ma'lumotlari localStorage da saqlanadi
- Har 5 daqiqada token yaroqliligi tekshiriladi

## API Endpoints

- `POST /auth/login` - Tizimga kirish
- `POST /auth/register` - Ro'yxatdan o'tish
- `GET /auth/profile` - Foydalanuvchi profilini olish
- `PATCH /users/:id` - Foydalanuvchi ma'lumotlarini yangilash

# OPPFrontend
