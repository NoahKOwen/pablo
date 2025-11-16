// client/src/components/TrustLoanCard.tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TRUST_LOAN_CONFIG } from "../../../shared/trust-loan";
import { STAKING_TIERS, type StakingTier } from "@shared/schema";
import { AlertCircle } from "lucide-react";
import { useMemo } from "react";

type TrustLoanStatus = {
  hasLoanStake: boolean;
  stake: any | null;
  directCount: number;
  investingCount: number;
  requiredReferrals: number;
  requiredInvestingReferrals: number;
  minInvestUsdtPerReferral: string;
  program: StakingTier;
  amountXnrt: number;
  durationDays: number;
};

export default function TrustLoanCard() {
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useQuery<TrustLoanStatus>({
    queryKey: ["/api/trust-loan/status"],
  });

  const claimMutation = useMutation({
    // 🔐 IMPORTANT: use apiRequest so CSRF header + cookies are sent
    mutationFn: async () => {
      return await apiRequest("POST", "/api/trust-loan/claim", {});
    },
    onSuccess: () => {
      toast({
        title: "Trust Loan claimed!",
        description: `You received ${TRUST_LOAN_CONFIG.amountXnrt.toLocaleString()} XNRT staked for ${TRUST_LOAN_CONFIG.durationDays} days.`,
      });
      // Refresh staking + balance + trust-loan status
      queryClient.invalidateQueries({ queryKey: ["/api/stakes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trust-loan/status"] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to claim Trust Loan";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const directCount = data?.directCount ?? 0;
  const investingCount = data?.investingCount ?? 0;
  const requiredReferrals = data?.requiredReferrals ?? TRUST_LOAN_CONFIG.requiredReferrals;
  const requiredInvestingReferrals =
    data?.requiredInvestingReferrals ?? TRUST_LOAN_CONFIG.requiredInvestingReferrals;
  const minInvestUsdtPerReferral =
    data?.minInvestUsdtPerReferral ?? String(TRUST_LOAN_CONFIG.minInvestUsdtPerReferral);

  const hasLoanStake = !!data?.hasLoanStake;

  // ✅ New logic: (directs >= required) OR (investing >= required)
  const canClaim = useMemo(() => {
    if (!data) return false;
    if (hasLoanStake) return false;

    const hasEnoughDirects = directCount >= requiredReferrals;
    const hasEnoughInvesting = investingCount >= requiredInvestingReferrals;

    return hasEnoughDirects || hasEnoughInvesting;
  }, [
    data,
    hasLoanStake,
    directCount,
    requiredReferrals,
    investingCount,
    requiredInvestingReferrals,
  ]);

  const directProgress =
    requiredReferrals > 0 ? Math.min(100, (directCount / requiredReferrals) * 100) : 0;
  const investingProgress =
    requiredInvestingReferrals > 0
      ? Math.min(100, (investingCount / requiredInvestingReferrals) * 100)
      : 0;

  const inlineError =
    (claimMutation.isError && (claimMutation.error as any)?.message) ||
    (isError && (error as any)?.message) ||
    null;

  const tierConfig = STAKING_TIERS[TRUST_LOAN_CONFIG.programKey as StakingTier];

  return (
    <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          Trust Loan ({TRUST_LOAN_CONFIG.durationDays} Days)
        </CardTitle>
        <CardDescription>
          Get {TRUST_LOAN_CONFIG.amountXnrt.toLocaleString()} XNRT staked for{" "}
          {TRUST_LOAN_CONFIG.durationDays} days. Unlock by:{" "}
          {requiredReferrals} directs <b>OR</b> {requiredInvestingReferrals} investing
          {" "}(&ge; {minInvestUsdtPerReferral} USDT)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading Trust Loan status...</p>
        )}

        {!isLoading && (
          <>
            <div className="space-y-3 text-sm">
              <div>
                <p className="flex items-center justify-between mb-1">
                  <span>Direct referrals</span>
                  <span className="font-mono">
                    {directCount} / {requiredReferrals}
                  </span>
                </p>
                <Progress value={directProgress} />
              </div>
              <div>
                <p className="flex items-center justify-between mb-1">
                  <span>Investing referrals (&ge; {minInvestUsdtPerReferral} USDT)</span>
                  <span className="font-mono">
                    {investingCount} / {requiredInvestingReferrals}
                  </span>
                </p>
                <Progress value={investingProgress} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                size="lg"
                disabled={!canClaim || claimMutation.isPending}
                onClick={() => claimMutation.mutate()}
              >
                {hasLoanStake
                  ? "Already Claimed"
                  : claimMutation.isPending
                  ? "Claiming..."
                  : "Claim Trust Loan"}
              </Button>

              {inlineError && (
                <div className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{inlineError}</span>
                </div>
              )}

              {!inlineError && !canClaim && !hasLoanStake && (
                <p className="text-xs text-muted-foreground">
                  Complete either the direct or investing referral requirements to unlock the Trust
                  Loan.
                </p>
              )}

              {hasLoanStake && (
                <p className="text-xs text-chart-2">
                  Trust Loan already active: {TRUST_LOAN_CONFIG.amountXnrt.toLocaleString()} XNRT
                  staked.
                </p>
              )}
            </div>

            {tierConfig && (
              <p className="text-xs text-muted-foreground pt-1">
                Daily Rate: {tierConfig.dailyRate}% • APY: {tierConfig.apy}% • Tier:{" "}
                {tierConfig.name}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
