self: { pkgs, ... }: {
  config = {
    environment.systemPackages = with self.packages.${pkgs.stdenv.system}; [
      trectl
      tre-creds
    ];
  };
}

