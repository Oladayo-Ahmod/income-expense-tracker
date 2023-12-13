import { query,int, update,text,Principal,float64, Record, 
    StableBTreeMap, Vec, Result, nat64, ic, Opt, Err, Ok, Canister }
 from 'azle';
import { v4 as uuidv4 } from 'uuid';


// user
const User = Record({
    id: Principal,
    username: text,
    password: text,
});

// Expenses
const Expenses = Record({
    id : Principal,
    name : text,
    userId : Principal,
    amount : float64,
    description : text,
    type : text,
    location : text, // where the expenses take place
    timestamp : nat64
});

// income
const Income = Record({
    id : Principal,
    name : text,
    userId : Principal,
    amount : float64,
    description : text,
    type : text,
    location : text, // where the income take place
    timestamp : nat64
});

// tracker
const Tracker = Record({
    totalExpenses : float64,
    totalIncome : float64,
    balance : float64,
    users : Vec(User)
});

// tracker storage
const trackerStorage : typeof Tracker = {
    totalExpenses : 0,
    totalIncome : 0,
    balance : 0,
    users : []
}

let currentUser : typeof User | undefined

const userStorage = StableBTreeMap(Principal,User,1);
const incomeStorage = StableBTreeMap(Principal,Income,2) //income storage
const expenseStorage = StableBTreeMap(Principal,Expenses,3) // expense storage

export default Canister({
// create new user
createUser: update(
  [text, text, float64],
  Result(text, text),
  (username :any, password : string, amount :number) => {

    const user = userStorage
      .values()
      .filter((c: typeof User) => c.username === username)[0];
    if (user) {
      return Err('user already exists.');
    }
    const newUser: typeof User = {
      id: idGenerator(),
      username,
      password,
      amount,
    };
    userStorage.insert(newUser.id, newUser);
    return Ok(`${newUser.username} added successfully.`);
  }
),

// authenticate user
authenticateUser: update(
  [text, text],
  Result(text, text),
  (username, password) => {
    const user : any = userStorage
      .values()
      .filter((c: typeof User) => c.username === username)[0];
    if (!user) {
      return Err('user does not exist.');
    }
    if (user.password !== password) {
      return Err('incorrect password');
    }
    currentUser = user;
    return Ok('Logged in');
  }
),

// logout user
logOut: update([], Result(text, text), () => {
  if (!currentUser) {
    return Err('no logged in user');
  }
  currentUser = undefined;
  return Ok('Logged out successfully.');
}),

// get current user
getCurrentUser : query([], Result(text, text), () => {
  if (!currentUser) {
    return Err('no logged in user.');
  }
  return Ok(currentUser.username);
}),

// add expense
addExpense: update(
  [text,float64,text,text,text],
  Result(text, text),
  (name,amount,description,type,location) => {
    if (!currentUser) {
      return Err('unathenticated');
    }

    const newExpense: typeof Expenses = {
      id: idGenerator(),
      name,
      userId : currentUser.id,
      amount,
      description,
      type,
      location,
      timestamp: ic.time(),
    };
    expenseStorage.insert(newExpense.id, newExpense);
    // userStorage.insert(currentUser.id, { ...currentUser });
    return Ok('Expenses added successfully.');
  }
),

// add income
addIncome: update(
  [text,float64,text,text,text],
  Result(text, text),
  (name,amount,description,type,location) => {
    if (!currentUser) {
      return Err('unathenticated');
    }

    const newIncome: typeof Income = {
      id: idGenerator(),
      name,
      userId : currentUser.id,
      amount,
      description,
      type,
      location,
      timestamp: ic.time(),
    };
    incomeStorage.insert(newIncome.id, newIncome);
    // userStorage.insert(currentUser.id, { ...currentUser });
    return Ok('Income added successfully.');
  }
),

// retrieve current user incomes
getCurrentUserIncome: query([], Result(Vec(Income), text), () => {
  if (!currentUser) {
    return Err('unathenticated');
  }
  const incomes = incomeStorage.values();
  const currentUserIncomes = incomes.filter(
    (income: typeof Income) =>
      income.userId === currentUser?.id
  );
  return Ok(currentUserIncomes);
}),

// retrieve current user expenses
getCurrentUserExpenses: query([], Result(Vec(Expenses), text), () => {
  if (!currentUser) {
    return Err('unathenticated');
  }
  const expenses = expenseStorage.values();
  const currentUserexpenses = expenses.filter(
    (expense: typeof Expenses) =>
      expense.userId === currentUser?.id
  );
  return Ok(currentUserexpenses);
}),

 // retrieve current user balance
 getCurrentUserBalance: query([], Result(text, text), () => {
  if (!currentUser) {
    return Err('unauthenticated');
  }

  const incomes = incomeStorage.values();
  const currentUserIncomes = incomes.filter(
    (income: typeof Income) => income.userId === currentUser?.id
  );

  const expenses = expenseStorage.values();
  const currentUserExpenses = expenses.filter(
    (expense: typeof Expenses) => expense.userId === currentUser?.id
  );

  const totalIncome = currentUserIncomes.reduce(
    (sum : any, income : any) => sum + income.amount,
    0
  );

  const totalExpenses = currentUserExpenses.reduce(
    (sum :any, expense :any) => sum + expense.amount,
    0
  );

  const balance = totalIncome - totalExpenses;

  return Ok(balance >= 0 ? `${balance} 'Surplus'` : `${balance}'Deficit'`);
}),

// retrieve current user expenses for the current month
getCurrentUserExpensesForCurrentMonth: query([], Result(Vec(Expenses), text), () => {
  if (!currentUser) {
    return Err('unauthenticated');
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed, so we add 1.

  const expenses = expenseStorage.values();
  const currentUserExpenses = expenses.filter(
    (expense: typeof Expenses) => {
      const expenseMonth = new Date(Number(expense.timestamp)).getMonth() + 1;
      return expense.userId === currentUser?.id && expenseMonth === currentMonth;
    }
  );

  return Ok(currentUserExpenses);
}),

// retrieve current user income for the current month
getCurrentUserIncomeForCurrentMonth: query([], Result(Vec(Income), text), () => {
  if (!currentUser) {
    return Err('unauthenticated');
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed, so we add 1.

  const incomes = incomeStorage.values();
  const currentUserIncome = incomes.filter(
    (income: typeof Income) => {
      const incomeMonth = new Date(Number(income.timestamp)).getMonth() + 1;
      return income.userId === currentUser?.id && incomeMonth === currentMonth;
    }
  );

  return Ok(currentUserIncome);
}),

getCurrentUserBalanceForCurrentMonth: query([], Result(text, text), () => {
  if (!currentUser) {
    return Err('unauthenticated');
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed, so we add 1.

  const incomes = incomeStorage.values();
  const currentUserIncomes = incomes.filter(
    (income: typeof Income) => {
      const incomeMonth = new Date(Number(income.timestamp)).getMonth() + 1;
      return income.userId === currentUser?.id && incomeMonth === currentMonth;
    }
  );

  const expenses = expenseStorage.values();
  const currentUserExpenses = expenses.filter(
    (expense: typeof Expenses) => {
      const expenseMonth = new Date(Number(expense.timestamp)).getMonth() + 1;
      return expense.userId === currentUser?.id && expenseMonth === currentMonth;
    }
  );

  const totalIncome = currentUserIncomes.reduce(
    (sum :any, income :any) => sum + income.amount,
    0
  );

  const totalExpenses = currentUserExpenses.reduce(
    (sum :any, expense :any) => sum + expense.amount,
    0
  );

  const balance = totalIncome - totalExpenses;

  return Ok(balance >= 0 ? `${balance} 'Surplus'` : `${balance}'Deficit'`);
}),


})

// ID generator
function idGenerator(): Principal {
  const randomBytes = new Array(29)
    .fill(0)
    .map((_) => Math.floor(Math.random() * 256));

  return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}

