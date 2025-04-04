import { PrismaClient, RoleType, TransactionType } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();
let minUtorid=10000000;
enum Roles {
	regular,
	cashier,
	manager,
	superuser,
}
async function createUser(utorid: string,role: RoleType,activated: boolean,verified: boolean,sus=false) {
	minUtorid++;
	const user = await prisma.user.create({
		data: {
			utorid: utorid,
			name: utorid,
			password: await bcrypt.hash(utorid,10),
			email: utorid+"@mail.utoronto.ca",
			points: 0,
			role: role,
			activated: activated,
			verified: verified,
			suspicious: sus,
		},
	});
	return user;
}

async function createEvent(name: string,startTime: Date,endTime: Date,capacity: number,points: number,published: boolean,numGuests:number) {
	await prisma.event.create({
		data: {
			name,
			description: name,
			location: name,
			startTime,
			endTime,
			capacity,
			pointsRemain: points,
			published,
			pointsAwarded: 0,
		},
	})
}

async function createPurchaseTransaction(
	amount: number,	// This is the dollars spent corresponding to spent
	points: number,	// This is the points earned corresponding to amount
	sus: boolean,
	userId: number,
	operatorId: number 
) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
		console.log("user not found");
		return;
	}
 	const transaction = await prisma.transaction.create({
		data: {
			type: "PURCHASE",
			amount: points,
			spent: amount,
			suspicious: sus,
			remarks: "",
			user: { connect: { id: userId } },
    	operator: { connect: { id: operatorId } },
		}
	});
	if (!sus) {
		await prisma.user.update({
			where: { id: userId },
			data: { points: user.points + points },
		});
	}
	return transaction
}

async function createAdjustmentTransaction(
	amount: number,
	userId: number,
	operatorId: number,
	relatedId: number, 
) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
		console.log("user not found");
		return;
	}
	await prisma.transaction.create({
		data: {
			type: "ADJUSTMENT",
			amount: amount,
			suspicious: false,
			remarks: "",
			user: { connect: { id: userId } },
			operator: { connect: { id: operatorId } },
			relatedTransaction: { connect: { id: relatedId } },
		},
	})
	await prisma.user.update({
		where: { id: userId },
		data: { points: user.points + amount },
	});
}

async function createTransferTransaction(
	recipientId: number,senderId: number, points: number
) {
	const recipient = await prisma.user.findUnique({
		where: { id: recipientId },
		select: { id: true, utorid: true, points: true },
	});
	const sendTransaction = await prisma.transaction.create({
		data: {
			type: "TRANSFER",
			amount: -points,
			remarks: "",
			user: { connect: { id: senderId } },
			sender: { connect: { id: senderId } },
			receiver: { connect: { id: recipientId } },
		},
	});
	const receiveTransaction = await prisma.transaction.create({
		data: {
			type: "TRANSFER",
			amount: points,
			remarks: "",
			user: { connect: { id: recipientId } },
			sender: { connect: { id: senderId } },
			receiver: { connect: { id: recipientId } },
		},
	});
	const updatedSender = await prisma.user.update({
		where: { id: senderId },
		data: { points: { decrement: points } },
	});
	const updatedReceiver = await prisma.user.update({
		where: { id: recipientId },
		data: { points: { increment: points } },
	});
}

async function createRedemptionTransaction(
	userId: number,
	amount: number
) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { points: true },
	});
	const validRedemptionAmount = amount ?? 0;
	const transaction = await prisma.transaction.create({
		data: {
			type: "REDEMPTION",
			amount: validRedemptionAmount,
			remarks: "",
			user: { connect: { id:userId } },
		},
	});
}

async function clearData() {
	await prisma.user.deleteMany({});
	await prisma.event.deleteMany({});
	await prisma.transaction.deleteMany({});
	
}

// Delete all existing data
clearData();

createEvent("a",new Date("2000-01-01"), new Date("2024-01-11"), 5000, 50000, true,0);
createEvent("a",new Date("2005-01-01"), new Date("2025-02-12"), 5000, 50000, true,0);
createEvent("a",new Date("2010-01-01"), new Date("2026-03-13"), 5000, 50000, true,0);
createEvent("a",new Date("2015-01-01"), new Date("2026-04-14"), 5000, 50000, true,0);
createEvent("a",new Date("2020-01-01"), new Date("2027-05-15"), 5000, 50000, true,0);
createEvent("a",new Date("2030-01-01"), new Date("2037-05-15"), 5000, 50000, true,0);
createEvent("a",new Date("2030-01-01"), new Date("2037-05-15"), 5000, 50000, false,0);

const regularUserIds=[]
for (let i=0; i<10;i++) {
	const user= await createUser(minUtorid.toString(), RoleType.REGULAR,true,true);
	regularUserIds.push(user.id);
}
for (let i=0; i<5;i++) {
	await createUser(minUtorid.toString(),RoleType.REGULAR,true,false);
	await createUser(minUtorid.toString(),RoleType.REGULAR,false,true);
	await createUser(minUtorid.toString(),RoleType.REGULAR,false,false);
}
const manager1 = await createUser("manager1",RoleType.MANAGER,true,true);
await createUser("manager2",RoleType.MANAGER,true,true);
const cashier1 = await createUser("cashier1",RoleType.CASHIER,true,true);
const sussycashier = await createUser("susier69",RoleType.CASHIER,true,true,true);
await createUser("cashier2",RoleType.CASHIER,true,true);
await createUser("cashier3",RoleType.CASHIER,true,true);
await createUser("cashier4",RoleType.CASHIER,true,true);
await createUser("clive123",RoleType.SUPERUSER,true,true)

// create transactions
const selectUsers = regularUserIds.slice(0,3);
for (const id of selectUsers) {
	for (let i=1;i<11;i++) {
		const transaction = await createPurchaseTransaction(1000*i,1000*i,false,id,cashier1.id);
		await createPurchaseTransaction(69*i,69*i,true,id,sussycashier.id);
		if (transaction) {
			await createAdjustmentTransaction(-40*i, id,manager1.id,transaction.id);
			await createAdjustmentTransaction(50*i, id,manager1.id,transaction.id);
		} else {
			console.log(`somehow purchase transaction ${i} NOT created for user ${id}`);
		}
		await createRedemptionTransaction(id, 50*i);
	}
}
for (let i=0;i<selectUsers.length-1;i++) {
	for (let j=1;j<6;j++) {
		await createTransferTransaction(selectUsers[i],selectUsers[i+1],10*j);
		await createTransferTransaction(selectUsers[i+1],selectUsers[i],5*j);
	}
}


