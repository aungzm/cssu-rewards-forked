Install
---------------------------------
cd backend

npm install

Set up db
----------------------------------------------
npx prisma generate

npx prisma db push

npx tsx prisma/seed.ts

Start dev server
------------------------------------------------
npx tsx --watch index.ts 3000
