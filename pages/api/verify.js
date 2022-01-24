// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import nextConnect from 'next-connect';
import middleware from '../../middleware/database';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const handler = nextConnect();
handler.use(middleware);

handler.post(
  async (req, res) => {
    try {
      const body = req.body;
      console.log("Received for verification", body);

      // mapping from harmony to etherscan
      const libraries = [];

      for (let i = 1; i < 11; ++i) {
        if (body[`libraryname${i}`]) {
          libraries.push(body[`libraryname${i}`]);
        }
      }

      let contractName = body.contractname;

      if (contractName.indexOf(":")>=0) {
        contractName = contractName.substring(contractName.indexOf(":") + 1);
      }

      let source = body.sourceCode;
      let optimizer = body.optimizationUsed === 0 ? "No" : "Yes";
      let optimizerTimes = body.runs;
      let settings = {};

      try {
        const config = JSON.parse(body.sourceCode);
        source = config.sources;
        optimizer = config.settings.optimizer.enabled;
        optimizerTimes = config.settings.optimizer.runs;
        settings = config.settings;
      }
      catch (e) {
        // do nothing;
      }

      const data = {
        contractAddress: body.contractaddress,   //Contract Address starts with 0x...     
        sourceCode: source,             //Contract Source Code (Flattened if necessary)
        contractName: contractName,         //ContractName (if codeformat=solidity-standard-json-input, then enter contractname as ex: erc20.sol:erc20)
        compiler: body.compilerversion,          // see https://etherscan.io/solcversions for list of support versions
        optimizer: optimizer, //0 = No Optimization, 1 = Optimization used (applicable when codeformat=solidity-single-file)
        optimizerTimes: optimizerTimes,                            //set to 200 as default unless otherwise  (applicable when codeformat=solidity-single-file)        
        constructorArguments: body.constructorArguements,     //if applicable
        chainType: "mainnet",
        libraries: libraries.join(" "),
        settings
      }

      console.log("Sending", data);

      const response = await fetch(process.env.VERIFICATION_URL, {
        method: 'post',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      const guid = uuidv4();
      let db = req.db.collection('status');

        // return this.message === "Pending in queue";
        // return this.message === "Fail - Unable to verify";
        // return this.message === "Pass - Verified";
        // return this.message.startsWith("Unable to locate ContractCode at");
     

      await db.updateOne({
        guid: guid.toString()
      }, {
        $set: {
          data,
          guid,
          result
        },
      },
        { upsert: true }
      );

      console.log("Sending the guid back", guid);
      
      res.json({ status: result.success === true ? 1 : 0, message: "Pass - Verified", result: guid });
    }
    catch (e) {
      console.log("Error", e);
      // res.status(503).json({"error": e});
      res.status(503).json({ status: 1, result: "Fail - Unable to verify", error: e});
    }
  }
);

handler.get(
  async (req, res) => {
    const body = req.query;
    const { guid } = body;
    
    if (!guid) {
      res.json({ message: "Invalid json" });
      return;
    }

    const doc = await req.db.collection('status').findOne({
      guid
    });
    console.log("Object is found?", doc);
    const result = {
      doc: doc,
      status: doc?.result?.success ? 1 : 0,
      ok: doc?.result?.success ? 1 : 0,
      message: doc?.result?.success ? "Pass - Verified" : "Fail - Unable to verify",
      result: doc?.result?.success ? "Pass - Verified" : "Fail - Unable to verify"
    }
    res.json(result);
  }
);
export default handler;
