import { useForm } from "react-hook-form";
import { loginSchema } from "../schema/loginSchema";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLogin } from "../service/useAuth";
import { TextField, Button, InputAdornment, IconButton } from "@mui/material";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { useState } from "react";
import logo from "../assets/AGS_logo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

type LoginFormValues = {
  email: string;
  password: string;
};

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    mode: "onChange",
  });

  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword(!showPassword);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        login(response.user);
        navigate("/dashboard");
      },
    });
  };

  return (
    <div
      className="h-screen w-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #0E21A0, #F5FBE6)",
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-125 bg-white p-10 rounded-xl">
        <div className="flex flex-col gap-5">
          <img src={logo} alt="logo" />
          <TextField
            label="Email"
            {...register("email")}
            size="small"
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            {...register("password", { required: "Password is required" })}
            error={!!errors.password}
            helperText={errors.password?.message}
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={togglePassword} edge="end">
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
          sx={{ background: "#0E21A0", color: "#F5FBE6" }}
        >
          {loginMutation.isPending ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}

export default LoginForm;
