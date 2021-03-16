import React, { useState } from "react"
import { SubmitButton } from "./Button"
import FormInput from "./FormInput"
import { withFormik, useFormikContext } from "formik"
import {
  validateAmountInRange,
  validateEthAddress,
  getErrorsObj,
} from "../forms/common-validators"
import { useCustomOnSubmitFormik } from "../hooks/useCustomOnSubmitFormik"
import { displayAmount, fromTokenUnit } from "../utils/token.utils"
import {
  normalizeAmount,
  formatAmount as formatFormAmount,
} from "../forms/form.utils.js"
import { lte } from "../utils/arithmetics.utils"
import * as Icons from "./Icons"
import MaxAmountAddon from "./MaxAmountAddon"
import useSetMaxAmountToken from "../hooks/useSetMaxAmountToken"
import moment from "moment"
import { AMOUNT_UNIT } from "../constants/constants"

const DelegateStakeForm = ({
  onSubmit,
  minStake,
  availableToStake,
  ...formikProps
}) => {
  const onSubmitBtn = useCustomOnSubmitFormik(onSubmit)
  const stakeTokensValue = fromTokenUnit(formikProps.values.stakeTokens)

  return (
    <form className="delegate-stake-form flex column">
      <TokensAmountField
        availableToStake={availableToStake}
        minStake={minStake}
        stakeTokensValue={stakeTokensValue}
      />
      <div className="address-fields-wrapper">
        <AddressField
          name="authorizerAddress"
          type="text"
          label="Authorizer Address"
          placeholder="0x0"
          icon={<Icons.AuthorizerFormIcon />}
          tooltipText="A role that approves operator contracts and slashing rules for operator misbehavior."
        />
        <AddressField
          name="operatorAddress"
          type="text"
          label="Operator Address"
          placeholder="0x0"
          icon={<Icons.OperatorFormIcon />}
          tooltipText="The operator address is tasked with participation in network operations, and represents the staker in most circumstances."
        />
        <AddressField
          name="beneficiaryAddress"
          type="text"
          label="Beneficiary Address"
          placeholder="0x0"
          icon={<Icons.BeneficiaryFormIcon />}
          tooltipText="The address to which rewards are sent that are generated by stake doing work on the network."
        />
      </div>
      <SubmitButton
        className="btn btn-primary btn-lg"
        type="submit"
        onSubmitAction={onSubmitBtn}
        withMessageActionIsPending={false}
        triggerManuallyFetch={true}
        disabled={!(formikProps.isValid && formikProps.dirty)}
      >
        delegate stake
      </SubmitButton>
    </form>
  )
}

const AddressField = ({ icon, ...formInputProps }) => {
  const [focused, setFocused] = useState(false)
  const { setFieldTouched, touched } = useFormikContext()
  const isTouched = focused || touched[formInputProps.name]

  const onFocus = () => {
    setFocused(true)
    if (
      formInputProps.name === "operatorAddress" &&
      !touched.authorizerAddress
    ) {
      setFieldTouched("authorizerAddress", true, false)
    } else if (
      formInputProps.name === "beneficiaryAddress" &&
      (!touched.authorizerAddress || !touched.operatorAddress)
    ) {
      setFieldTouched("authorizerAddress", true, false)
      setFieldTouched("operatorAddress", true, false)
    }
  }

  return (
    <div className={`address-field-wrapper${isTouched ? " touched" : ""}`}>
      <Icons.DashedLine />
      {icon}
      <FormInput {...formInputProps} onFocus={onFocus} />
    </div>
  )
}

const TokensAmountField = ({
  availableToStake,
  minStake,
  stakeTokensValue,
}) => {
  const onAddonClick = useSetMaxAmountToken("stakeTokens", availableToStake)
  const stakingDocsLink = (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={"https://staking.keep.network/about-staking/staking-minimums"}
      className="text-white text-link"
    >
      here
    </a>
  )

  const nextMinStake = () => {
    let finalValue = 110000
    const currentDate = moment().utc()

    // Minimum stake diminishing schedule can be found here:
    // https://staking.keep.network/about-staking/staking-minimums
    const minimumStakeDiminishingSchedule = [
      moment.utc("04-28-2020", "MM-DD-YYYY"),
      moment.utc("07-10-2020", "MM-DD-YYYY"),
      moment.utc("09-21-2020", "MM-DD-YYYY"),
      moment.utc("03-12-2020", "MM-DD-YYYY"),
      moment.utc("02-14-2021", "MM-DD-YYYY"),
      moment.utc("04-28-2021", "MM-DD-YYYY"),
      moment.utc("07-10-2021", "MM-DD-YYYY"),
      moment.utc("21-09-2021", "MM-DD-YYYY"),
      moment.utc("12-03-2021", "MM-DD-YYYY"),
      moment.utc("02-14-2022", "MM-DD-YYYY"),
    ]

    let finalDate = minimumStakeDiminishingSchedule[0]

    for (const date of minimumStakeDiminishingSchedule) {
      if (currentDate.isSameOrAfter(date)) {
        finalValue -= 10000
      } else {
        finalDate = date
        break
      }
    }

    return {
      value: finalValue,
      date: finalDate.format("MM/DD/YYYY"),
    }
  }

  const nextMinStakeInfo = nextMinStake()
  return (
    <div className="token-amount-wrapper">
      <div className="token-amount-field">
        <FormInput
          name="stakeTokens"
          type="text"
          label="Token Amount"
          normalize={normalizeAmount}
          format={formatFormAmount}
          placeholder="0"
          additionalInfoText={`MIN STAKE ${displayAmount(minStake)} KEEP`}
          leftIcon={<Icons.KeepOutline className="keep-outline--mint-100" />}
          inputAddon={
            <MaxAmountAddon onClick={onAddonClick} text="Max Stake" />
          }
          tooltipText={
            <>
              The minimum stake will decrease to{" "}
              {displayAmount(nextMinStakeInfo.value, true, AMOUNT_UNIT.TOKEN)}{" "}
              KEEP on {nextMinStakeInfo.date}. You can see the full schedule in
              our staking docs {stakingDocsLink}
            </>
          }
        />
        <div className="text-caption--green-theme text-right ml-a">
          {displayAmount(availableToStake)} available to stake
        </div>
      </div>
    </div>
  )
}

const connectedWithFormik = withFormik({
  mapPropsToValues: () => ({
    beneficiaryAddress: "",
    stakeTokens: "",
    operatorAddress: "",
    authorizerAddress: "",
  }),
  validate: (values, props) => {
    const { beneficiaryAddress, operatorAddress, authorizerAddress } = values
    const errors = {}

    errors.stakeTokens = getStakeTokensError(props, values)
    errors.beneficiaryAddress = validateEthAddress(beneficiaryAddress)
    errors.operatorAddress = validateEthAddress(operatorAddress)
    errors.authorizerAddress = validateEthAddress(authorizerAddress)

    return getErrorsObj(errors)
  },
  displayName: "DelegateStakeForm",
})(DelegateStakeForm)

const getStakeTokensError = (props, { stakeTokens }) => {
  const { availableToStake, minStake } = props

  if (lte(availableToStake || 0, 0)) {
    return "Insufficient funds"
  } else {
    return validateAmountInRange(stakeTokens, availableToStake, minStake)
  }
}

export default connectedWithFormik
