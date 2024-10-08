import { FormEventHandler, useCallback, useContext, useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import { useApiFetch } from "../hooks/useApiFetch";
import { LoginContext } from "../hooks/useLogin";
import { useTranslation } from "react-i18next";

interface Props {
    isRegister?: boolean,
}

export const LoginRegisterForm = ({ isRegister }: Props) => {
    const loginManager = useContext(LoginContext);
    const { t } = useTranslation();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const mapLoginResult = useCallback(parseLoginResponse, []);

    const [reqParams, setReqParams] = useState<RequestInit>({});
    const {
        refetch: loginOrRegister,
    } = useApiFetch(`/user/${isRegister ? "register" : "login"}`, mapLoginResult, reqParams, true);

    useEffect(() => {
        setReqParams({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, password2 }),
        });
    }, [username, password, password2]);

    const submitHandler: FormEventHandler = (event) => {
        event.preventDefault();
        const asyncBody = async () => {
            setError("");
            setLoading(true);
            const response = await loginOrRegister();
            setLoading(false);
            if ("userError" in response) {
                setError(response.userError);
                return;
            }

            const { sessionId } = response.value;
            loginManager.login(sessionId);

            setUsername("");
            setPassword("");
            setPassword2("");
        };
        void asyncBody();
    };

    return (
        <Form onSubmit={submitHandler}>
            <Form.Group>
                <Form.Label htmlFor="inputUsername">{t("username")}</Form.Label>
                <Form.Control minLength={3} maxLength={30} required
                    id="inputUsername"
                    aria-describedby="usernameHelp"
                    value={username}
                    onChange={({ target }) => { setUsername(target.value); }} />
                {isRegister && <Form.Text id="usernameHelp" muted>
                    {t("usernameInfo", { min: 3, max: 30 })}
                </Form.Text>}
            </Form.Group>
            <Form.Group className="my-3">
                <Form.Label htmlFor="inputPassword">{t("password")}</Form.Label>
                <Form.Control minLength={10} maxLength={100} required
                    type="password"
                    id="inputPassword"
                    aria-describedby="passwordHelp"
                    value={password}
                    onChange={({ target }) => { setPassword(target.value); }} />
                {isRegister && <Form.Text id="passwordHelp" muted>
                    {t("passwordInfo", { min: 10, max: 100 })}
                </Form.Text>}
            </Form.Group>
            {isRegister && <Form.Group className="my-3">
                <Form.Label htmlFor="inputPassword2">{t("passwordConfirm")}</Form.Label>
                <Form.Control minLength={10} maxLength={100} required
                    type="password"
                    id="inputPassword2"
                    aria-describedby="password2Help"
                    value={password2}
                    onChange={({ target }) => { setPassword2(target.value); }} />
                <Form.Text id="password2Help" muted>
                    {t("passwordConfirmInfo")}
                </Form.Text>
            </Form.Group>}
            {error && <p className="text-danger">
                {t(`error.${error}`)}
            </p>}
            <Button variant="primary" type="submit" disabled={loading}>
                {loading && <Spinner size="sm" role="status" aria-hidden="true" style={{ marginRight: 6 }} />}
                {(isRegister ? t("register") : t("login"))}
            </Button>
        </Form >
    );
};

const parseLoginResponse = (value: unknown): { sessionId: string } => {
    if (value == null || typeof value !== "object" || !("session_id" in value) || typeof value.session_id !== "string") {
        throw new Error("unexpected server response: " + JSON.stringify(value));
    }
    return { sessionId: value.session_id };
};
