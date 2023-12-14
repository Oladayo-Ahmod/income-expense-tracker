import {
  $query,
  int,
  $update,
  text,
  Principal,
  float64,
  Record,
  StableBTreeMap,
  Vec,
  Result,
  nat64,
  ic,
  Opt,
} from 'azle';

import { v4 as uuidv4 } from 'uuid';

// Define User type
type User = Record<{
  id: string;
  username: text;
  password: text;
}>;

// Define Expenses type
type Expenses = Record<{
  id: string;
  name: text;
  userId: string;
  amount: float64;
  description: text;
  location: text;
  timestamp: nat64;
}>;

type ExpensePayload = Record<{
  name: text;
  amount: float64;
  description: text;
  location: text;
}>;

// Define Income type
type Income = Record<{
  id: string;
  name: text;
  userId: string;
  amount: float64;
  description: text;
  location: text;
  timestamp: nat64;
}>;

// Define Income type
type IncomePayload = Record<{
  name: text;
  amount: float64;
  description: text;
  location: text;
}>;

// Define Tracker type
type Tracker = Record<{
  totalExpenses: float64;
  totalIncome: float64;
  balance: float64;
  users: Vec<User>;
}>;

// Define Tracker storage type
type TrackerStorage = Record<{
  totalExpenses: float64;
  totalIncome: float64;
  balance: float64;
  users: Vec<User>;
}>;

let currentUser: User | undefined;

// Create StableBTreeMap for user storage
const userStorage = new StableBTreeMap<string, User>(0, 44, 1024);
const incomeStorage = new StableBTreeMap<string, Income>(1, 44, 1024); // income storage
const expenseStorage = new StableBTreeMap<string, Expenses>(2, 44, 1024); // expense storage

$update
export function createUser(username: text, password: text): Result<string, string> {
  try {
    if (!username || !password) {
      return Result.Err('Invalid username or password.');
    }

    // Find if the user already exists
    const existingUser = userStorage
      .values()
      .find((c: User) => c.username === username);

    if (existingUser) {
      return Result.Err('User already exists.');
    }

    // Create a new user record
    const newUser: User = {
      id: uuidv4(),
      username,
      password,
    };

    userStorage.insert(newUser.id, newUser);

    return Result.Ok<string, string>(`${newUser.username} added successfully.`);
  } catch (error) {
    return Result.Err(`Failed to create user: ${error}`);
  }
}

$update
export function authenticateUser(username: text, password: text): Result<string, string> {
  try {
    if (!username || !password) {
      return Result.Err('Invalid username or password.');
    }

    // Find the user by username
    const user = userStorage.values().find((c: User) => c.username === username);

    if (!user) {
      return Result.Err('User does not exist.');
    }

    // Check if the provided password matches the user's password
    if (user.password !== password) {
      return Result.Err('Incorrect password');
    }

    // Set the current user
    currentUser = user;

    return Result.Ok('Logged in');
  } catch (error) {
    return Result.Err(`Failed to authenticate user: ${error}`);
  }
}

$update
export function logOut(): Result<string, string> {
  try {
    if (!currentUser) {
      return Result.Err('No logged in user');
    }

    currentUser = undefined;

    return Result.Ok('Logged out successfully.');
  } catch (error) {
    return Result.Err(`Failed to log out: ${error}`);
  }
}

$query
export function getCurrentUser(): Result<string, string> {
  try {
    if (!currentUser) {
      return Result.Err('No logged in user');
    }

    return Result.Ok(currentUser.username);
  } catch (error) {
    return Result.Err(`Failed to get current user: ${error}`);
  }
}

$update
export function addExpense(payload: ExpensePayload): Result<string, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    // Payload validation
    const { name, amount, description, location } = payload;
    if (!name || amount < 0 || !description || !location) {
      return Result.Err('Invalid expense payload');
    }

    const newExpense: Expenses = {
      id: uuidv4(),
      userId: currentUser.id,
      timestamp: ic.time(),
      name: payload.name,
      amount: payload.amount,
      description: payload.description,
      location: payload.location,
    };

    expenseStorage.insert(newExpense.id, newExpense);

    return Result.Ok('Expense added successfully.');
  } catch (error) {
    return Result.Err(`Failed to add expense: ${error}`);
  }
}

$update
export function addIncome(payload: IncomePayload): Result<string, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    // Payload validation
    const { name, amount, description, location } = payload;
    if (!name || amount < 0 || !description || !location) {
      return Result.Err('Invalid income payload');
    }

    const newIncome: Income = {
      id: uuidv4(),
      userId: currentUser.id,
      timestamp: ic.time(),
      name: payload.name,
      amount: payload.amount,
      description: payload.description,
      location: payload.location,
    };

    incomeStorage.insert(newIncome.id, newIncome);

    return Result.Ok('Income added successfully.');
  } catch (error) {
    return Result.Err(`Failed to add income: ${error}`);
  }
}

$query
export function getCurrentUserIncome(): Result<Vec<Income>, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const incomes = incomeStorage.values();
    const currentUserIncomes = incomes.filter((income: Income) => income.userId === currentUser!.id);

    return Result.Ok(currentUserIncomes);
  } catch (error) {
    return Result.Err(`Failed to get current user income: ${error}`);
  }
}

$query
export function getCurrentUserExpenses(): Result<Vec<Expenses>, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const expenses = expenseStorage.values();
    const currentUserExpenses = expenses.filter((expense: Expenses) => expense.userId === currentUser!.id);

    return Result.Ok(currentUserExpenses);
  } catch (error) {
    return Result.Err(`Failed to get current user expenses: ${error}`);
  }
}

$query
export function getCurrentUserBalance(): Result<string, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const incomes = incomeStorage.values();
    const currentUserIncomes = incomes.filter((income: Income) => income.userId === currentUser!.id);

    const expenses = expenseStorage.values();
    const currentUserExpenses = expenses.filter((expense: Expenses) => expense.userId === currentUser!.id);

    const totalIncome = currentUserIncomes.reduce((sum: number, income: Income) => sum + income.amount, 0);
    const totalExpenses = currentUserExpenses.reduce((sum: number, expense: Expenses) => sum + expense.amount, 0);

    const balance = totalIncome - totalExpenses;

    return Result.Ok(balance >= 0 ? `${balance} Surplus` : `${balance} Deficit`);
  } catch (error) {
    return Result.Err(`Failed to get current user balance: ${error}`);
  }
}

$query
export function getCurrentUserExpensesForCurrentMonth(): Result<Vec<Expenses>, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed, so we add 1.

    const expenses = expenseStorage.values();
    const currentUserExpenses = expenses.filter((expense: Expenses) => {
      const expenseMonth = new Date(Number(expense.timestamp)).getMonth() + 1;
      return expense.userId === currentUser!.id && expenseMonth === currentMonth;
    });

    return Result.Ok(currentUserExpenses);
  } catch (error) {
    return Result.Err(`Failed to get current user expenses for the current month: ${error}`);
  }
}

$query
export function getCurrentUserIncomeForCurrentMonth(): Result<Vec<Income>, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed, so we add 1.

    const incomes = incomeStorage.values();
    const currentUserIncome = incomes.filter((income: Income) => {
      const incomeMonth = new Date(Number(income.timestamp)).getMonth() + 1;
      return income.userId === currentUser!.id && incomeMonth === currentMonth;
    });

    return Result.Ok(currentUserIncome);
  } catch (error) {
    return Result.Err(`Failed to get current user income for the current month: ${error}`);
  }
}

type UserTransaction = Record<{ income?: Income; expense?: Expenses }>;

$query
export function getCurrentUserTransactionsForCurrentYear(): Result<Vec<UserTransaction>, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const incomes = incomeStorage.values();
    const currentUserIncomes = incomes.filter((income: Income) => {
      const incomeYear = new Date(Number(income.timestamp)).getFullYear();
      return income.userId === currentUser!.id && incomeYear === currentYear;
    });

    const expenses = expenseStorage.values();
    const currentUserExpenses = expenses.filter((expense: Expenses) => {
      const expenseYear = new Date(Number(expense.timestamp)).getFullYear();
      return expense.userId === currentUser!.id && expenseYear === currentYear;
    });

    const incomeTransactions: UserTransaction[] = currentUserIncomes.map((income) => ({ income }));
    const expenseTransactions: UserTransaction[] = currentUserExpenses.map((expense) => ({ expense }));

    const transactions: UserTransaction[] = [...incomeTransactions, ...expenseTransactions];

    return Result.Ok(transactions);
  } catch (error) {
    return Result.Err(`Failed to get current user transactions for the current year: ${error}`);
  }
}

$query
export function getCurrentUserBalanceForCurrentMonth(): Result<string, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed, so we add 1.

    const incomes = incomeStorage.values();
    const currentUserIncomes = incomes.filter((income: Income) => {
      const incomeMonth = new Date(Number(income.timestamp)).getMonth() + 1;
      return income.userId === currentUser!.id && incomeMonth === currentMonth;
    });

    const expenses = expenseStorage.values();
    const currentUserExpenses = expenses.filter((expense: Expenses) => {
      const expenseMonth = new Date(Number(expense.timestamp)).getMonth() + 1;
      return expense.userId === currentUser!.id && expenseMonth === currentMonth;
    });

    const totalIncome = currentUserIncomes.reduce((sum: number, income: Income) => sum + income.amount, 0);
    const totalExpenses = currentUserExpenses.reduce((sum: number, expense: Expenses) => sum + expense.amount, 0);

    const balance = totalIncome - totalExpenses;

    return Result.Ok(balance >= 0 ? `${balance} Surplus` : `${balance} Deficit`);
  } catch (error) {
    return Result.Err(`Failed to get current user balance for the current month: ${error}`);
  }
}

$query
export function getCurrentUserBalanceForCurrentDay(): Result<string, string> {
  try {
    if (!currentUser) {
      return Result.Err('Unauthenticated');
    }

    const currentDate = new Date();
    const currentDay = currentDate.getDate();

    const incomes = incomeStorage.values();
    const currentUserIncomes = incomes.filter((income) => {
      const incomeDay = new Date(Number(income.timestamp)).getDate();
      return income.userId === currentUser!.id && incomeDay === currentDay;
    });

    const expenses = expenseStorage.values();
    const currentUserExpenses = expenses.filter((expense) => {
      const expenseDay = new Date(Number(expense.timestamp)).getDate();
      return expense.userId === currentUser!.id && expenseDay === currentDay;
    });

    const totalIncome = currentUserIncomes.reduce((sum: number, income) => sum + income.amount, 0);
    const totalExpenses = currentUserExpenses.reduce((sum: number, expense) => sum + expense.amount, 0);

    const balance = totalIncome - totalExpenses;

    return Result.Ok(balance >= 0 ? `${balance} Surplus` : `${balance} Deficit`);
  } catch (error) {
    return Result.Err(`Failed to get current user balance for the current day: ${error}`);
  }
}

$query
export function getCurrentUserBalanceForCurrentYear(): Result<string, string> {
  if (!currentUser) {
    return Result.Err('Unauthenticated');
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const incomes = incomeStorage.values();
  const currentUserIncomes = incomes.filter((income) => {
    const incomeYear = new Date(Number(income.timestamp)).getFullYear();
    return income.userId === currentUser!.id && incomeYear === currentYear;
  });

  const expenses = expenseStorage.values();
  const currentUserExpenses = expenses.filter((expense) => {
    const expenseYear = new Date(Number(expense.timestamp)).getFullYear();
    return expense.userId === currentUser!.id && expenseYear === currentYear;
  });

  const totalIncome = currentUserIncomes.reduce((sum: number, income) => sum + income.amount, 0);
  const totalExpenses = currentUserExpenses.reduce((sum: number, expense) => sum + expense.amount, 0);

  const balance = totalIncome - totalExpenses;

  return Result.Ok(balance >= 0 ? `${balance} Surplus` : `${balance} Deficit`);
}


globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32)

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }

    return array
  }
}