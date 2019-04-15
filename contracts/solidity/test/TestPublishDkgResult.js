import { duration } from './helpers/increaseTime';
import {bls} from './helpers/data';
import mineBlocks from './helpers/mineBlocks';
import generateTickets from './helpers/generateTickets';
const KeepToken = artifacts.require('./KeepToken.sol');
const StakingProxy = artifacts.require('./StakingProxy.sol');
const TokenStaking = artifacts.require('./TokenStaking.sol');
const KeepRandomBeaconProxy = artifacts.require('./KeepRandomBeacon.sol');
const KeepRandomBeaconImplV1 = artifacts.require('./KeepRandomBeaconImplV1.sol');
const KeepGroupProxy = artifacts.require('./KeepGroup.sol');
const KeepGroupImplV1 = artifacts.require('./KeepGroupImplV1.sol');


contract('TestPublishDkgResult', function(accounts) {

  const minimumStake = 200000;
  const groupThreshold = 15;
  const groupSize = 20;
  const timeoutInitial = 20;
  const timeoutSubmission = 100;
  const timeoutChallenge = 60;
  const timeoutDKG = 20;
  const resultPublicationBlockStep = 3;

  let disqualified, inactive, resultHash,
  token, stakingProxy, stakingContract, randomBeaconValue, requestId,
  keepRandomBeaconImplV1, keepRandomBeaconProxy, keepRandomBeaconImplViaProxy,
  keepGroupImplV1, keepGroupProxy, keepGroupImplViaProxy, groupPubKey,
  owner = accounts[0], magpie = accounts[0], signature, delegation,
  operator1 = accounts[0], tickets1,
  operator2 = accounts[1], tickets2,
  operator3 = accounts[2], tickets3;
  requestId = 0;
  disqualified = '0x0000000000000000000000000000000000000000'
  inactive = '0x0000000000000000000000000000000000000000'
  groupPubKey = "0x1000000000000000000000000000000000000000000000000000000000000000"

  resultHash = web3.utils.soliditySha3(groupPubKey, disqualified, inactive);

  beforeEach(async () => {
    token = await KeepToken.new();

    // Initialize staking contract under proxy
    stakingProxy = await StakingProxy.new();
    stakingContract = await TokenStaking.new(token.address, stakingProxy.address, duration.days(30));
    await stakingProxy.authorizeContract(stakingContract.address, {from: owner})

    // Initialize Keep Random Beacon contract
    keepRandomBeaconImplV1 = await KeepRandomBeaconImplV1.new();
    keepRandomBeaconProxy = await KeepRandomBeaconProxy.new(keepRandomBeaconImplV1.address);
    keepRandomBeaconImplViaProxy = await KeepRandomBeaconImplV1.at(keepRandomBeaconProxy.address);

    // Initialize Keep Group contract
    keepGroupImplV1 = await KeepGroupImplV1.new();
    keepGroupProxy = await KeepGroupProxy.new(keepGroupImplV1.address);
    keepGroupImplViaProxy = await KeepGroupImplV1.at(keepGroupProxy.address);
    await keepGroupImplViaProxy.initialize(
      stakingProxy.address, keepRandomBeaconProxy.address, minimumStake, groupThreshold,
      groupSize, timeoutInitial, timeoutSubmission, timeoutChallenge, timeoutDKG, resultPublicationBlockStep
    );

    randomBeaconValue = bls.groupSignature;

    await keepRandomBeaconImplViaProxy.initialize(1,1, randomBeaconValue, bls.groupPubKey, keepGroupProxy.address);
    await keepRandomBeaconImplViaProxy.relayEntry(1, bls.groupSignature, bls.groupPubKey, bls.previousEntry, bls.seed);

    // Stake delegate tokens to operator1
    signature = Buffer.from((await web3.eth.sign(web3.utils.soliditySha3(owner), operator1)).substr(2), 'hex');
    delegation = '0x' + Buffer.concat([Buffer.from(magpie.substr(2), 'hex'), signature]).toString('hex');
    await token.approveAndCall(stakingContract.address, minimumStake*2000, delegation, {from: owner});
    tickets1 = generateTickets(randomBeaconValue, operator1, 2000);

    // Stake delegate tokens to operator2
    signature = Buffer.from((await web3.eth.sign(web3.utils.soliditySha3(owner), operator2)).substr(2), 'hex');
    delegation = '0x' + Buffer.concat([Buffer.from(magpie.substr(2), 'hex'), signature]).toString('hex');
    await token.approveAndCall(stakingContract.address, minimumStake*2000, delegation, {from: owner});
    tickets2 = generateTickets(randomBeaconValue, operator2, 2000);

    // Stake delegate tokens to operator3
    signature = Buffer.from((await web3.eth.sign(web3.utils.soliditySha3(owner), operator3)).substr(2), 'hex');
    delegation = '0x' + Buffer.concat([Buffer.from(magpie.substr(2), 'hex'), signature]).toString('hex');
    await token.approveAndCall(stakingContract.address, minimumStake*3000, delegation, {from: owner});
    tickets3 = generateTickets(randomBeaconValue, operator3, 3000);

  })

  it("should generate signatures and submit a correct result", async function() {

    for(let i = 0; i < groupSize; i++) {
      await keepGroupImplViaProxy.submitTicket(tickets1[i].value, operator1, tickets1[i].virtualStakerIndex, {from: operator1});
    }

    for(let i = 0; i < groupSize; i++) {
      await keepGroupImplViaProxy.submitTicket(tickets2[i].value, operator2, tickets2[i].virtualStakerIndex, {from: operator2});
    }

    for(let i = 0; i < groupSize; i++) {
      await keepGroupImplViaProxy.submitTicket(tickets3[i].value, operator3, tickets3[i].virtualStakerIndex, {from: operator3});
    }

    let selectedParticipants = await keepGroupImplViaProxy.selectedParticipants();

    let positions = [];
    let signatures;
    for(let i = 0; i < selectedParticipants.length; i++) {
      let signature = await web3.eth.sign(resultHash, selectedParticipants[i]);
      positions.push(i+1);
      if (signatures == undefined) signatures = signature
      else signatures += signature.slice(2, signature.length);
    }

    // Jump in time to when first member is eligible to submit,
    let submissionStart = await keepGroupImplViaProxy.ticketSubmissionStartBlock();
    let currentBlock = await web3.eth.getBlockNumber();
    mineBlocks(submissionStart.toNumber() + timeoutChallenge + timeoutDKG - currentBlock);

    await keepGroupImplViaProxy.submitDkgResult(requestId, 1, groupPubKey, disqualified, inactive, signatures, positions, {from: selectedParticipants[0]})
    let submitted = await keepGroupImplViaProxy.isDkgResultSubmitted.call(requestId);
    assert.equal(submitted, true, "DkgResult should should be submitted");
  });
})
