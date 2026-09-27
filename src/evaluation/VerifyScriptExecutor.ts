export interface VerifyRunResult {
  exitCode: number | null;
  output: string;
  timedOut: boolean;
}

export interface VerifyScriptExecutor {
  run(absoluteScriptPath: string, cwd: string): Promise<VerifyRunResult>;
}
