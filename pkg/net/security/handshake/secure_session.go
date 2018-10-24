package handshake

import (
	"context"
	"net"

	libp2pcrypto "github.com/libp2p/go-libp2p-crypto"
	peer "github.com/libp2p/go-libp2p-peer"
)

type authenticatedSession struct {
	net.Conn

	localPeerID         peer.ID
	localPeerPrivateKey libp2pcrypto.PrivKey

	remotePeerID        peer.ID
	remotePeerPublicKey libp2pcrypto.PubKey
}

func newAuthenticatedSession(
	ctx context.Context,
	localPeerID peer.ID,
	privateKey libp2pcrypto.PrivKey,
	unauthenticatedConn net.Conn,
	remotePeerID peer.ID,
) (*authenticatedSession, error) {
	remotePublicKey, err := remotePeerID.ExtractPublicKey()
	if err != nil {
		return nil, err
	}

	return &authenticatedSession{
		Conn:                unauthenticatedConn,
		localPeerID:         localPeerID,
		localPeerPrivateKey: privateKey,
		remotePeerID:        remotePeerID,
		remotePeerPublicKey: remotePublicKey,
	}, nil
}
