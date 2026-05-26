{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs_latest
          pnpm
          just
          postgresql_16
          infisical
        ];

        # Keep 1Password CLI outside the Nix shell for now: nixpkgs'
        # stable `_1password-cli` does not yet support `op run --environment`.
        shellHook = ''
          export OP_ENVIRONMENT_ID=le35y7a3du23ysthxvaxgnnenq
        '';
      };
    });
}
