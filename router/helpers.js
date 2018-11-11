var pg = require("pg");
var connectionString = process.env.CONNECTIONSTR;
var client = new pg.Client(connectionString);
client.connect();

module.exports = {
    start: function() {
        let price = `CREATE TABLE IF NOT EXISTS price(priceID VARCHAR(10) NOT NULL PRIMARY KEY, pDate VARCHAR(100), value INTEGER)`;
        let company = `CREATE TABLE IF NOT EXISTS company(companyID VARCHAR(4) NOT NULL PRIMARY KEY, numOfShares INTEGER, industry VARCHAR(32), companyName VARCHAR(32), priceID VARCHAR(10) NOT NULL, FOREIGN KEY (priceID) REFERENCES price(priceID))`;
        let leaderBoard = `CREATE TABLE IF NOT EXISTS leaderboard(leaderboardID VARCHAR(10) NOT NULL PRIMARY KEY, numOfTraders INTEGER)`;
        let trader = `CREATE TABLE IF NOT EXISTS trader(traderID VARCHAR(10) NOT NULL PRIMARY KEY, funds INTEGER, traderName VARCHAR(12) UNIQUE, leaderboardID VARCHAR(10) NOT NULL, portfolioID VARCHAR(10) NOT NULL, FOREIGN KEY (portfolioID) REFERENCES portfolio ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (leaderboardID) REFERENCES leaderboard ON DELETE CASCADE ON UPDATE CASCADE)`;
        let portfolio = `CREATE TABLE IF NOT EXISTS portfolio(portfolioID VARCHAR(10) NOT NULL PRIMARY KEY)`;
        let watchList = `CREATE TABLE IF NOT EXISTS watchlist(watchlistID VARCHAR(10) NOT NULL PRIMARY KEY, traderID VARCHAR(10), FOREIGN KEY (traderID) REFERENCES trader ON DELETE SET NULL ON UPDATE CASCADE)`;
        let includes = `CREATE TABLE IF NOT EXISTS includes(watchlistID VARCHAR(10) NOT NULL, companyID CHAR(4) NOT NULL, PRIMARY KEY (companyID, watchlistID), FOREIGN KEY (watchlistID) REFERENCES watchlist(watchlistID), FOREIGN KEY (companyID) REFERENCES company(companyID))`;
        let contains = `CREATE TABLE IF NOT EXISTS contains(portfolioID VARCHAR(10) NOT NULL, companyID CHAR(4), PRIMARY KEY (portfolioID, companyID), FOREIGN KEY (portfolioID) REFERENCES portfolio(portfolioID), FOREIGN KEY (companyID) REFERENCES company(companyID))`;
        let transaction = `CREATE TABLE IF NOT EXISTS transaction(transactionID VARCHAR(10) PRIMARY KEY, traderID VARCHAR(10) NOT NULL, companyID CHAR(4) NOT NULL, priceID VARCHAR(10) NOT NULL, type BIT(1), sharesPurchased INTEGER, FOREIGN KEY (traderID) REFERENCES trader(traderID) ON DELETE NO ACTION ON UPDATE CASCADE, FOREIGN KEY (priceID) REFERENCES price(priceID) ON DELETE NO ACTION ON UPDATE CASCADE)`;
        
        let arr = [price, company, leaderBoard, portfolio, trader, watchList, includes, contains, transaction];
        
        arr.forEach((query) => {
            client.query(query, (err, result) => {
                if (err) {
                    console.log(query + err);
                } else {
                    console.log(result);
                }
            })
        });
        
        let leaderboardID = 1;
        let addLeaderboard = `INSERT INTO leaderboard(leaderboardID, numOfTraders) values ($1, $2)`
        client.query(addLeaderboard, [leaderboardID, 0], (err, result) => {
            if (err) {
                console.log(err.detail);
            } else {
                console.log(result);
            }
        });
    },

    getCompanyByID: async function(CID) {
        try {
            let findCompany = `SELECT * FROM company WHERE companyid = $1`;
            let company = await client.query(findCompany, [CID]);
            return company;
        } catch (err) {
            throw err;
        }
    },

    addTransaction: async function(TID, CID, priceID, type, numOfShares) {
        try {
            let TXID = generateID();
            let addTX = `INSERT INTO transaction(transactionID, traderID, companyID, priceID, type, sharesPurchased) values($1, $2, $3, $4, $5, $6)`;
            await client.query(addTX, [TXID, TID, CID, priceID, type, numOfShares]);
            return;
        } catch (err) {
            throw err;
        }
    },

    getValue: async function(priceID) {
        try {
            let findPrice = `SELECT * FROM price WHERE priceid = $1`;
            let price = await client.query(findPrice, [priceID]);
            return price.rows[0].value;
        } catch (err) {
            throw err;
        }
    },

    updateFunds: async function(TID, value, numOfShares, type) {
        try {
            let findFunds = `SELECT funds FROM trader WHERE traderID = $1`;
            let funds = await client.query(findFunds, [TID]);
            let amount = funds.rows[0].funds;
            if (type === 1) {
                amount -= (value * numOfShares);
            } else {
                amount += (value * numOfShares);
            }
            let updateFunds = `UPDATE trader SET funds=($1) WHERE traderID=($2)`;
            await client.query(updateFunds, [amount, TID]);
            return;
        } catch (err) {
            throw err;
        }
    },

    getPortfolioID: async function(TID) {
        try {
            let getPortID = `SELECT portfolioID FROM trader WHERE traderID = $1`;
            let rows = await client.query(getPortID, [TID]);
            let portfolioID = rows.rows[0].portfolioid;
            return portfolioID;
        } catch (err) {
            throw err;
        }
    },

    checkContains: async function(portfolioID, CID, type) {
        try {
            let join = `SELECT companyID FROM trader NATURAL JOIN contains`;
            let companys = await client.query(join);
            if (type === 1) {
                if (companys.rows.length === 0) {
                    let addRow = `INSERT INTO contains(portfolioID, companyID) values($1, $2)`;
                    await client.query(addRow, [portfolioID, CID]);
                }
            } else {
                if (companys.rows.length === 1) {
                    let deleteRow = `DELETE FROM contains WHERE portfolioID = $1 AND companyID = $2`;
                    await client.query(deleteRow, [portfolioID, CID]);
                }
            }
            return;
        } catch (err) {
            throw err;
        }
    }
}