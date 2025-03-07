self: { pkgs, ... }: {
  config = {
    networking.hostName = "HELLO";
    environment.systemPackages = with self.packages.${pkgs.stdenv.system}; [
      trectl
      tre-creds
    ];
  };
}

