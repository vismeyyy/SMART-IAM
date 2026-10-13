import { useNavigate } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#030712] to-[#030712]"></div>
      <div className="absolute w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-blue-600/15 rounded-full blur-[100px] sm:blur-[130px] -top-32 sm:-top-40 -left-16 sm:-left-20"></div>
      <div className="absolute w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-indigo-600/10 rounded-full blur-[80px] sm:blur-[100px] bottom-0 right-0"></div>

      <div className="w-full max-w-sm sm:max-w-md relative z-10">
        <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-[28px] p-5 sm:p-8 shadow-[0_0_50px_-10px_rgba(59,130,246,0.25)]">
          
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Sign in to SmartIAM</h1>
            <p className="text-blue-300/60 text-xs sm:text-sm mt-1">Root User Login</p>
          </div>

          <form className="space-y-4 sm:space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-[11px] sm:text-xs text-blue-200/70 mb-1 block">Email</label>
              <input type="email" placeholder="Enter your email" className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition" />
            </div>

            <div>
              <label className="text-[11px] sm:text-xs text-blue-200/70 mb-1 block">Password</label>
              <input type="password" placeholder="Enter your password" className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition" />
            </div>

            <button type="submit" className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(37,99,235,0.4)] text-sm sm:text-base">
              Sign In
            </button>
          </form>

          <div className="flex justify-between items-center mt-5 sm:mt-7 text-xs sm:text-sm">
            <span className="text-blue-300/50 cursor-pointer hover:text-blue-300 transition">
              Forgot password?
            </span>
            <span onClick={() => navigate("/create-account")} className="text-blue-400 cursor-pointer hover:underline">
              Create account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}