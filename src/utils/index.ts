export const findPermutations = (string: string): string | string[] => {
  if (!string || typeof string !== "string") {
    return "Please enter a string";
  } else if (string.length < 2) {
    return string;
  }

  let permutationsArray: string[] = [];

  for (let i = 0; i < string.length; i++) {
    let char = string[i];

    // if (string.indexOf(char) != i)
    // continue

    let remainingChars =
      string.slice(0, i) + string.slice(i + 1, string.length);

    for (let permutation of findPermutations(remainingChars)) {
      // console.log({char})
      // console.log({permutation})
      permutationsArray.push(char + permutation);
    }
  }
  if (permutationsArray.length === 0) return string;
  return permutationsArray;
};

export const objectPropInArray = (list, userType, user, ticket = false) => {
  if (list.length > 0) {
    for (let i in list) {
      if (ticket != false) {
        if (list[i][userType] == user && list[i]["ticket"] == ticket) {
          return i;
        }
      } else {
        if (list[i][userType] == user) {
          return i;
        }
      }
    }
  }
  return null;
};

export const roundTo = (n: number, digits: number): number => {
  var negative = false;
  if (digits === undefined) {
    digits = 0;
  }
  if (n < 0) {
    negative = true;
    n = n * -1;
  }
  var multiplicator = Math.pow(10, digits);
  n = parseFloat((n * multiplicator).toFixed(11));
  n = Number((Math.round(n) / multiplicator).toFixed(digits));
  if (negative) {
    n = Number((n * -1).toFixed(digits));
  }
  var value = n.toString();
  var valueInString: string = value;
  var res = value.split(".");
  if (res.length == 1 || res[1].length < 3) {
    valueInString = n.toFixed(2);
  }
  return Number(valueInString);
};

export const checkIfTicketIsAdminBlocked = ({
  blockedData,
  masterCounter,
  ticketName,
  ticketMode,
  number,
  count,
}) => {
  try {
    let isBlocked: boolean = false;
    blockedData.forEach((blockObj) => {
      if (!isBlocked) {
        if (isBlockValid(blockObj, ticketMode, number, ticketName)) {
          // valid block
          if (blockObj.count == 0) {
            // add ticket to blocked tickets
            isBlocked = true;
          } else {
            // find existing count
            let ticketCount: number;
            if (blockObj.mode == "ALL") {
              ticketCount = findAllCount({
                ticketName,
                number: number,
                mode: ticketMode,
                counter: masterCounter,
              });
            } else {
              ticketCount = findModeCount({
                ticketName,
                number: number,
                mode: ticketMode,
                counter: masterCounter,
              });
            }

            if (Number(ticketCount) + Number(count) > blockObj.count) {
              // add ticket to blocked tickets
              isBlocked = true;
            }
          }
        }
      }
    });
    return isBlocked;
  } catch (error) {}
};

const isBlockValid = (
  blockObj: { mode: string; group: string; number: string; ticketName: string },
  ticketMode: string,
  number: any,
  ticketName: any
) => {
  let cond1 = false;
  if (blockObj.mode == ticketMode) {
    cond1 = true;
  } else {
    if (ticketMode == "SUPER" || ticketMode == "BOX") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "3";
    } else if (ticketMode == "AB" || ticketMode == "BC" || ticketMode == "AC") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "2";
    } else if (ticketMode == "A" || ticketMode == "B" || ticketMode == "C") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "1";
    }
  }
  let cond2 = blockObj.number == number || blockObj.number == "ALL";
  let cond3 = blockObj.ticketName == ticketName || blockObj.ticketName == "ALL";

  return cond1 && cond2 && cond3;
};

const findAllCount = ({ ticketName, number, mode, counter }): number => {
  let numberCount = counter.find((item) => item.number == number);
  if (mode == "SUPER" || mode == "BOX") {
    return Number(numberCount.SUPER) + Number(numberCount.BOX);
  } else if (mode == "AB" || mode == "BC" || mode == "AC") {
    return (
      Number(numberCount.AB) + Number(numberCount.BC) + Number(numberCount.AC)
    );
  } else if (mode == "A" || mode == "B" || mode == "C") {
    return (
      Number(numberCount.A) + Number(numberCount.B) + Number(numberCount.C)
    );
  }
};

const findModeCount = ({ ticketName, number, mode, counter }) => {
  let numberCount = counter.find((item) => item.number == number);
  return numberCount[mode];
};

export const checkIfTicketIsUserBlocked = ({
  userBlockList, // user block list from DB
  ticketName, // name of the ticket
  ticket,
  targetCounter, //
}) => {
  let isBlocked = false;

  userBlockList.forEach((blockObj) => {
    if (!isBlocked) {
      if (isBlockValidV2(blockObj, ticket, ticketName)) {
        // valid block
        if (blockObj.count == 0) {
          // add ticket to blocked tickets
          isBlocked = true;
        } else {
          // find existing count
          let ticketCount: number;
          if (blockObj.mode == "ALL") {
            ticketCount = findAllCount({
              ticketName,
              number: ticket.number,
              mode: ticket.mode,
              counter: targetCounter,
            });
          } else {
            ticketCount = findModeCount({
              ticketName,
              number: ticket.number,
              mode: ticket.mode,
              counter: targetCounter,
            });
          }
          if (Number(ticketCount) + Number(ticket.count) > blockObj.count) {
            // add ticket to blocked tickets
            isBlocked = true;
          }
        }
      }
    }
  });

  return isBlocked;
};

const isBlockValidV2 = (blockObj, ticket, ticketName) => {
  let cond1 = false;
  if (blockObj.mode == ticket.mode) {
    cond1 = true;
  } else {
    if (ticket.mode == "SUPER" || ticket.mode == "BOX") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "3";
    } else if (
      ticket.mode == "AB" ||
      ticket.mode == "BC" ||
      ticket.mode == "AC"
    ) {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "2";
    } else if (ticket.mode == "A" || ticket.mode == "B" || ticket.mode == "C") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "1";
    }
  }
  let cond2 = blockObj.number == ticket.number || blockObj.number == "ALL";
  let cond3 = blockObj.ticketName == ticketName || blockObj.ticketName == "ALL";

  return cond1 && cond2 && cond3;
};

export const sortUsers = (a, b) => {
  // if (a.sort != null || b.sort != null) {
  //   if (a.sort < b.sort) {
  //     return -1;
  //   } else if (a.sort > b.sort) {
  //     return 1;
  //   }
  // } else {
  if (a.createdAt < b.createdAt) {
    return -1;
  } else if (a.createdAt > b.createdAt) {
    return 1;
  } else return 0;
  // }
};
