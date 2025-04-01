import { PrismaClient, RoleType } from "@prisma/client";
const prisma = new PrismaClient();
let minUtorid=10000000;
enum Roles {
	regular,
	cashier,
	manager,
	superuser,
}
async function createUser(utorid: string,role: RoleType,activated: boolean,verified: boolean) {
	minUtorid++;
	await prisma.user.create({
		data: {
			utorid: utorid,
			name: utorid,
			password: utorid,
			email: utorid+"@mail.utoronto.ca",
			points: 0,
			role: role,
			activated: activated,
			verified: verified,
		},
	});
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

async function createTransactions() {
	await prisma.transaction
}
createEvent("a",new Date("2000-01-01"), new Date("2024-01-11"), 5000, 50000, true,0);
createEvent("a",new Date("2005-01-01"), new Date("2025-02-12"), 5000, 50000, true,0);
createEvent("a",new Date("2010-01-01"), new Date("2026-03-13"), 5000, 50000, true,0);
createEvent("a",new Date("2015-01-01"), new Date("2026-04-14"), 5000, 50000, true,0);
createEvent("a",new Date("2020-01-01"), new Date("2027-05-15"), 5000, 50000, true,0);
createEvent("a",new Date("2030-01-01"), new Date("2037-05-15"), 5000, 50000, true,0);
createEvent("a",new Date("2030-01-01"), new Date("2037-05-15"), 5000, 50000, false,0);

for (let i=0; i<100;i++) {
	createUser(minUtorid.toString(), RoleType.REGULAR,true,true);
}
for (let i=0; i<10;i++) {
	createUser(minUtorid.toString(),RoleType.REGULAR,true,false);
	createUser(minUtorid.toString(),RoleType.REGULAR,false,true);
	createUser(minUtorid.toString(),RoleType.REGULAR,false,false);
}
createUser("manager1",RoleType.MANAGER,true,true);
createUser("manager2",RoleType.MANAGER,true,true);
createUser("cashier1",RoleType.CASHIER,true,true);
createUser("cashier2",RoleType.CASHIER,true,true);
createUser("cashier3",RoleType.CASHIER,true,true);
createUser("cashier4",RoleType.CASHIER,true,true);
createUser("clive123",RoleType.SUPERUSER,true,true)

