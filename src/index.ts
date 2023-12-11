import { query,int, update,text,Principal,float64, Record, 
    StableBTreeMap, Vec, Result, nat64, ic, Opt, Err, Ok, Canister }
 from 'azle';
import { v4 as uuidv4 } from 'uuid';


// user
const User = Record({
    id: Principal,
    username: text,
    password: text,
    amount: float64,
});

// Expenses
const Expenses = Record({
    id : Principal,
    name : text,
    userId : Principal,
    amount : float64,
    description : text,
    type : text,
    location : text // where the expenses take place
});

// income
const Income = Record({
    id : Principal,
    name : text,
    userId : Principal,
    amount : float64,
    description : text,
    type : text,
    location : text // where the income take place
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

})

// ID generator
function idGenerator(): Principal {
  const randomBytes = new Array(29)
    .fill(0)
    .map((_) => Math.floor(Math.random() * 256));

  return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}

