import { Dispatch, SetStateAction } from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { useTranslation } from "react-i18next";

/**
 * @param value The input value.
 * @returns A localized error string or null if the input is valid.
 */
type Validator = (value: string) => string | null;

export interface Props {
    name: string,
    /**
     * Prefix to add before `name` to form the translation key. E.g. is name:
     * "foo", tPrefix: "bar", the help string will be bar.foo.help
     */
    pfx: string,
    shouldValidate: boolean,
    validate: Validator,

    input: string,
    setInput: Dispatch<SetStateAction<string>>,
}

export const ValidatedTextInput = (props: Props) => {
    const { t } = useTranslation();

    const controlName = `${props.name}InputControl`;
    const helpName = `${props.name}InputHelp`;

    const error = props.shouldValidate ? props.validate(props.input) : null;

    return (
        <Form.Group controlId={controlName}>
            <Form.Label>{t(`${props.pfx}.${props.name}.name`)}</Form.Label>
            <InputGroup hasValidation>
                <Form.Control required aria-describedby={helpName}
                    isInvalid={props.shouldValidate && error != null}
                    isValid={props.shouldValidate && error == null}
                    value={props.input} onChange={(({ target }) => { props.setInput(target.value); })} />
                {props.shouldValidate && error != null && <Form.Control.Feedback type="invalid">
                    {error}
                </Form.Control.Feedback>}
            </InputGroup>
            <Form.Text id={helpName} muted>
                {t(`${props.pfx}.${props.name}.help`)}
            </Form.Text>
        </Form.Group>
    );
};
