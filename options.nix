self: { config, lib, pkgs, ... }: 
with lib;
let 
  serverInstance = name: let 
    crg = config.services.tre-server.${name};
  in {
    options = {
      enable = mkEnableOption "ssb/tre pub server (sbot)";

      allowedUsers = mkOption {
        type = types.listOf types.str;
        default = [ "root" ];
        defaultText = literalExpression "[ \"root\" ]";
        description = "Members of the group that owns the controlling unix socket";
      };

      authorizedKeys = mkOption {
        type = types.attrsOf (types.listOf types.str);
        default = { };
        description = "Map of remote public keys to list of allowed muxrpc method paths (dot separated paths)";
        #check = value: builtins.all (k: builtins.match "^@.*.ed25519$" k != null)
        #  (builtins.attrNames value);
      };

      package = mkOption {
        type = types.package;
        default = self.packages.${pkgs.stdenv.system}.default;
        defaultText = literalExpression "pkgs.tre-cli-server";
        description = "package to use.";
      };

      tcp = {
        host = mkOption {
          type = types.str;
          default = "127.0.0.1";
          defaultText = "127.0.0.1";
          description = "TCP host/address to bind to";
        };

        port = mkOption {
          type = types.port;
          description = "TCP port to use";
        };
      };

      http = {
        host = mkOption {
          type = types.str;
          default = "127.0.0.1";
          defaultText = "127.0.0.1";
          description = "HTTP host/address to bind to (for websockets and HTTP API)";
        };

        port = mkOption {
          type = types.port;
          description = "TCP port to use for HTTI API/websockets";
        };
      };
    
      blobs = {
        sympathy = mkOption {
          type = types.int;
          default = 10;
          defaultText = "10";
          description = "";
        };

        max = mkOption {
          type = types.int;
          default = 3221225472;
          defaultText = "3221225472";
          description = "Maximum blob size in bytes";
        };
      };
    };
  };

in {

  options.services.tre-server = mkOption {
    type = types.attrsOf (types.submodule serverInstance);
    default = {};
    description = "Named instances of tre-server";
  };

}
