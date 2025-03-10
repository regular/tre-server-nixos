self: { config, lib, pkgs, ... }: 
let
  credsPath = name: "/etc/tre-creds/${name}";
  runtimePath = name: "tre-server/${name}";
  rpcSocketPath = name: "/var/run/${runtimePath name}"; # NOTE: no filename
  initSocketPath = name: "/var/run/${runtimePath name}/initial-state.socket";

  receive-initial-state = "${self.inputs.initial-states.packages.${pkgs.stdenv.system}.receive-initial-state}/bin/receive-initial-state";

  requiredFiles = [ "flume/log.offset" ];
  
  attrs = config.services.tre-server;
  enabled_server_names = builtins.filter (name: attrs.${name}.enable) (lib.attrNames attrs);
  servers = builtins.foldl' (acc: x: (acc // { ${x} = attrs.${x}; }) ) {} enabled_server_names;

in with lib; {
  config =  mkIf ((length enabled_server_names) != 0) {

    secrets = mapAttrs' (name: cfg: {
      name = "tre-server-${name}";
      value = {
        path = credsPath name;
      };
    }) servers;

    initial-states = mapAttrs' (name: cfg: {
      name = "tre-server-${name}";
      value = {
        socketPath = initSocketPath name;
        inherit requiredFiles;
      };
    }) servers;

    users.groups = mapAttrs' (name: cfg: {
      name = "ssb-${name}";
      value.members = cfg.allowedUsers;
    }) servers;

    systemd.services = mapAttrs' (name: cfg: let
      globalOpts = "--config %d/${name} --appname ${name} --path $STATE_DIRECTORY/ssb --socketPath ${rpcSocketPath name}";
      tcpOpts = "--host ${cfg.tcp.host} --port ${toString cfg.tcp.port}" + optionalString (cfg.tcp.fqdn != null) " --fqdn ${cfg.tcp.fqdn}"; 
      wsOpts = "--ws.host ${cfg.http.host} --ws.port ${toString cfg.http.port}";
      blobsOpts = "--blobs.sympathy ${toString cfg.blobs.sympathy} --blobs.max ${toString cfg.blobs.max}";
      group = "ssb-${name}";
      
      requiresFiles = (builtins.length config.initial-states."tre-server-${name}".requiredFiles) != 0;
      receiveInitStateOpts = builtins.concatStringsSep " " (builtins.map (x: "--requiredFile '${x}'") requiredFiles);
      ExecReceiveInitState = if requiresFiles then "${receive-initial-state} server --socketPath ${initSocketPath name} --statePath $STATE_DIRECTORY/ssb --tmpPath=$STATE_DIRECTORY/tmp ${receiveInitStateOpts} && " else "";

      allowedMethods = key: (builtins.concatStringsSep "," cfg.authorizedKeys.${key});
      keys = builtins.attrNames cfg.authorizedKeys;
      keyOpt = key: "--authorizedKeys '${key}:" + (allowedMethods key) + "'";
      keyOpts = builtins.concatStringsSep " " (map keyOpt keys);
    in {
      name = "tre-server-${name}";
      value = {
        description = "tre server for ${name} network";
        after = [ "network-online.target" ];
        wants = [ "network-online.target" ];
        wantedBy = [ "multi-user.target" ];

        unitConfig = {
          AssertSecurity = "tpm2";
        };

        serviceConfig = {
          # NOTE: this causes switching of configs to hang until the state is received
          Type = "notify";
          NotifyAccess = "all"; # tre-server is a child of bash
          TimeoutStartSec="180min";
          ExecStart = "${pkgs.bash}/bin/bash -eu -c \"${ExecReceiveInitState} ${cfg.package}/bin/tre-server ${globalOpts} ${tcpOpts} ${wsOpts} ${blobsOpts} ${keyOpts}\"";
          WorkingDirectory = "/tmp";
          LoadCredentialEncrypted = "${name}:${credsPath name}";
          StandardOutput = "journal";
          StandardError = "journal";

          DynamicUser = true;
          SupplementaryGroups = [group]; 
          RuntimeDirectoryMode = "0750";
          ExecStartPost = [
            "${pkgs.coreutils}/bin/chmod 660 \${RUNTIME_DIRECTORY}/socket"
            "${pkgs.coreutils}/bin/chgrp -R ${group} \${RUNTIME_DIRECTORY}"
          ];

          RuntimeDirectory = runtimePath name;
          StateDirectory = "tre-server/${name}";
          Environment = [
            "DEBUG=multiserver*,tre-server:*"
          ];
        };
      };
    }) servers;
  };
}
