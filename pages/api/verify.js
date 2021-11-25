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

      const data = {
        contractAddress: body.contractaddress,   //Contract Address starts with 0x...     
        sourceCode: body.sourceCode,             //Contract Source Code (Flattened if necessary)
        contractName: body.contractname,         //ContractName (if codeformat=solidity-standard-json-input, then enter contractname as ex: erc20.sol:erc20)
        compiler: body.compilerversion,          // see https://etherscan.io/solcversions for list of support versions
        optimizer: body.optimizationUsed == 0 ? "No" : "Yes", //0 = No Optimization, 1 = Optimization used (applicable when codeformat=solidity-single-file)
        optimizerTimes: body.runs,                            //set to 200 as default unless otherwise  (applicable when codeformat=solidity-single-file)        
        constructorArguments: body.constructorArguements,     //if applicable
        chainType: "mainnet",
        libraries: libraries.join(",")
      }

      console.log("Sending", data);

      const response = await fetch(process.env.VERIFICATION_URL, {
        method: 'post',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      console.log("Result is", result);

      const guid = uuidv4();
      let db = req.db.collection('status');
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

      
      res.json({ guid });
    }
    catch (e) {
      console.log("Error", e);
    }
  }
);

handler.get(
  async (req, res) => {
    console.log("GET called");

    if (!req.body || req.body.length === 0) {
      res.json({ message: "Invalid json" });
      return;
    }
    const body = req.body;
    const { guid } = body;
    console.log(guid);
    console.log(req.body);

    const doc = await req.db.collection('status').findOne({
      guid
    });
    console.log(doc);
    const result = {
      doc: doc,
      status: doc?.result?.success ? 1 : 0,
      message: doc?.result?.success ? "OK" : "NOTOK",
      result: doc?.result?.success ? "OK" : doc?.result.message
    }
    res.json(result);
  }
);
export default handler;
