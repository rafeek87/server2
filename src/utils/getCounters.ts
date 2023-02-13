var { getTotalCount, getUserCount } = require("./sqlHelpers");

export const getMasterCounter = async (tickets, ticketName, resultDate) => {
  let masterCounter = [];
  for (let ticket of tickets) {
    try {
      if (ticket.mode == "SUPER" || ticket.mode == "BOX") {
        // check if number already exists in counter
        let counterIndex = masterCounter.findIndex(
          (element) => element.number == ticket.number
        );
        if (counterIndex == -1) {
          // create new record in counter
          let count1 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "SUPER",
          });
          let count2 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "BOX",
          });
          masterCounter.push({
            number: ticket.number,
            SUPER: count1,
            BOX: count2,
            newCountSuper: ticket.mode == "SUPER" ? Number(ticket.count) : 0,
            newCountBox: ticket.mode == "BOX" ? Number(ticket.count) : 0,
          });
        } else {
          // add new count to counter
          if (ticket.mode == "SUPER") {
            masterCounter[counterIndex].newCountSuper =
              masterCounter[counterIndex].newCountSuper + Number(ticket.count);
          } else if (ticket.mode == "BOX") {
            masterCounter[counterIndex].newCountBox =
              masterCounter[counterIndex].newCountBox + Number(ticket.count);
          }
        }
      } else if (
        ticket.mode == "AB" ||
        ticket.mode == "BC" ||
        ticket.mode == "AC"
      ) {
        // check if number already exists in counter
        let counterIndex = masterCounter.findIndex(
          (element) => element.number == ticket.number
        );
        if (counterIndex == -1) {
          // create new record in counter
          let count1 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "AB",
          });
          let count2 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "BC",
          });
          let count3 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "AC",
          });
          masterCounter.push({
            number: ticket.number,
            AB: Number(count1),
            BC: Number(count2),
            AC: Number(count3),
            newCountAb: ticket.mode == "AB" ? Number(ticket.count) : 0,
            newCountBc: ticket.mode == "BC" ? Number(ticket.count) : 0,
            newCountAc: ticket.mode == "AC" ? Number(ticket.count) : 0,
          });
        } else {
          // add new count to counter
          if (ticket.mode == "AB") {
            masterCounter[counterIndex].newCountAb =
              masterCounter[counterIndex].newCountAb + Number(ticket.count);
          } else if (ticket.mode == "BC") {
            masterCounter[counterIndex].newCountBc =
              masterCounter[counterIndex].newCountBc + Number(ticket.count);
          } else if (ticket.mode == "AC") {
            masterCounter[counterIndex].newCountAc =
              masterCounter[counterIndex].newCountAc + Number(ticket.count);
          }
        }
      } else if (
        ticket.mode == "A" ||
        ticket.mode == "B" ||
        ticket.mode == "C"
      ) {
        // check if number already exists in counter
        let counterIndex = masterCounter.findIndex(
          (element) => element.number == ticket.number
        );
        if (counterIndex == -1) {
          // create new record in counter
          let count1 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "A",
          });
          let count2 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "B",
          });
          let count3 = await getTotalCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "V",
          });
          masterCounter.push({
            number: ticket.number,
            A: Number(count1),
            B: Number(count2),
            C: Number(count3),
            newCountA: ticket.mode == "A" ? Number(ticket.count) : 0,
            newCountB: ticket.mode == "B" ? Number(ticket.count) : 0,
            newCountC: ticket.mode == "C" ? Number(ticket.count) : 0,
          });
        } else {
          // add new count to counter
          if (ticket.mode == "A") {
            masterCounter[counterIndex].newCountA =
              masterCounter[counterIndex].newCountA + Number(ticket.count);
          } else if (ticket.mode == "B") {
            masterCounter[counterIndex].newCountB =
              masterCounter[counterIndex].newCountB + Number(ticket.count);
          } else if (ticket.mode == "C") {
            masterCounter[counterIndex].newCountC =
              masterCounter[counterIndex].newCountC + Number(ticket.count);
          }
        }
      }
    } catch (err) {
      console.log("getMasterCounter error");
      console.log(err);
    }
  }
  return masterCounter;
};

export const getUserCounterV2 = async (
  tickets,
  ticketName,
  resultDate,
  userId,
  userType
) => {
  let userCounter = [];
  // await Promise.all(
  //   tickets.map(async (ticket) => {

  //   })
  // );
  for (let ticket of tickets) {
    try {
      if (ticket.mode == "SUPER" || ticket.mode == "BOX") {
        // check if number already exists in counter
        let counterIndex = userCounter.findIndex(
          (element) => element.number == ticket.number
        );
        if (counterIndex == -1) {
          // create new record in counter
          let count1 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "SUPER",
            userId,
            userType,
          });
          let count2 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "BOX",
            userId,
            userType,
          });
          userCounter.push({
            number: Number(ticket.number),
            SUPER: Number(count1),
            BOX: Number(count2),
            newCountSUPER: ticket.mode == "SUPER" ? Number(ticket.count) : 0,
            newCountBOX: ticket.mode == "BOX" ? Number(ticket.count) : 0,
          });
        } else {
          // add new count to counter
          if (ticket.mode == "SUPER") {
            userCounter[counterIndex].newCountSUPER =
              userCounter[counterIndex].newCountSUPER + Number(ticket.count);
          } else if (ticket.mode == "BOX") {
            userCounter[counterIndex].newCountBOX =
              userCounter[counterIndex].newCountBOX + Number(ticket.count);
          }
        }
      } else if (
        ticket.mode == "AB" ||
        ticket.mode == "BC" ||
        ticket.mode == "AC"
      ) {
        // check if number already exists in counter
        let counterIndex = userCounter.findIndex(
          (element) => element.number == ticket.number
        );
        if (counterIndex == -1) {
          // create new record in counter
          let count1 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "AB",
            userId,
            userType,
          });
          let count2 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "BC",
            userId,
            userType,
          });
          let count3 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "AC",
            userId,
            userType,
          });
          userCounter.push({
            number: ticket.number,
            AB: Number(count1),
            BC: Number(count2),
            AC: Number(count3),
            newCountAB: ticket.mode == "AB" ? Number(ticket.count) : 0,
            newCountBC: ticket.mode == "BC" ? Number(ticket.count) : 0,
            newCountAC: ticket.mode == "AC" ? Number(ticket.count) : 0,
          });
        } else {
          // add new count to counter
          if (ticket.mode == "AB") {
            userCounter[counterIndex].newCountAB =
              userCounter[counterIndex].newCountAB + Number(ticket.count);
          } else if (ticket.mode == "BC") {
            userCounter[counterIndex].newCountBC =
              userCounter[counterIndex].newCountBC + Number(ticket.count);
          } else if (ticket.mode == "AC") {
            userCounter[counterIndex].newCountAC =
              userCounter[counterIndex].newCountAC + Number(ticket.count);
          }
        }
      } else if (
        ticket.mode == "A" ||
        ticket.mode == "B" ||
        ticket.mode == "C"
      ) {
        // check if number already exists in counter
        let counterIndex = userCounter.findIndex(
          (element) => element.number == ticket.number
        );
        if (counterIndex == -1) {
          // create new record in counter
          let count1 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "A",
            userId,
            userType,
          });
          let count2 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "B",
            userId,
            userType,
          });
          let count3 = await getUserCount({
            ticketName,
            resultDate,
            number: ticket.number,
            mode: "C",
            userId,
            userType,
          });
          userCounter.push({
            number: ticket.number,
            A: Number(count1),
            B: Number(count2),
            C: Number(count3),
            newCountA: ticket.mode == "A" ? Number(ticket.count) : 0,
            newCountB: ticket.mode == "B" ? Number(ticket.count) : 0,
            newCountC: ticket.mode == "C" ? Number(ticket.count) : 0,
          });
        } else {
          // add new count to counter
          if (ticket.mode == "A") {
            userCounter[counterIndex].newCountA =
              userCounter[counterIndex].newCountA + Number(ticket.count);
          } else if (ticket.mode == "B") {
            userCounter[counterIndex].newCountB =
              userCounter[counterIndex].newCountB + Number(ticket.count);
          } else if (ticket.mode == "C") {
            userCounter[counterIndex].newCountC =
              userCounter[counterIndex].newCountC + Number(ticket.count);
          }
        }
      }
    } catch (err) {
      console.log("code Af34");
      console.log(err);
    }
  }
  return userCounter;
};
