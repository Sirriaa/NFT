const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL 연결
const axios = require('axios');
const app = express();

app.use(express.json()); // JSON 데이터 처리

// PostgreSQL 설정
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '1234',
  port: 5432,
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 기본 경로 설정 (홈페이지)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Market.html'));
});

// API: 마켓 NFT 가져오기
app.get('/api/get-market-nfts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM nfts');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Market NFTs fetch error:', error.message);
    res.status(500).json({ error: 'NFT 데이터를 가져오는 데 실패했습니다.' });
  }
});

// API: 프로필 저장
app.post('/api/profile', async (req, res) => {
  const { username, bio, email, link, wallet_address } = req.body;

  if (!wallet_address) {
    return res.status(400).json({ error: '지갑 주소가 필요합니다.' });
  }

  try {
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)',
      [wallet_address]
    );

    if (existingUser.rows.length > 0) {
      await pool.query(
        'UPDATE users SET username = $1, bio = $2, email = $3, link = $4 WHERE LOWER(wallet_address) = LOWER($5)',
        [username, bio, email, link, wallet_address]
      );
      res.json({ message: '프로필 정보가 성공적으로 업데이트되었습니다.' });
    } else {
      await pool.query(
        'INSERT INTO users (username, bio, email, link, wallet_address) VALUES ($1, $2, $3, $4, $5)',
        [username, bio, email, link, wallet_address]
      );
      res.json({ message: '새로운 프로필 정보가 저장되었습니다.' });
    }
  } catch (error) {
    console.error('프로필 저장 오류:', error.message);
    res.status(500).json({ error: '프로필 저장 중 오류가 발생했습니다.' });
  }
});

// API: 사용자 프로필 가져오기
app.get('/api/profile/:address', async (req, res) => {
  const { address } = req.params;

  try {
    const result = await pool.query(
      'SELECT username, bio, email, link, wallet_address FROM users WHERE LOWER(wallet_address) = LOWER($1)',
      [address]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('프로필 조회 오류:', error.message);
    res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다.' });
  }
});

// API: NFT 저장
app.post('/api/save-nft', async (req, res) => {
  const { name, price, description, royalties, imageUrl } = req.body;

  try {
    await pool.query(
      'INSERT INTO nfts (name, price, description, royalties, image_url) VALUES ($1, $2, $3, $4, $5)',
      [name, price, description, royalties, imageUrl]
    );
    res.json({ message: 'NFT가 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error('NFT 저장 오류:', error.message);
    res.status(500).json({ error: 'NFT 저장 중 오류가 발생했습니다.' });
  }
});

// API: 사용자 NFT 목록 가져오기
app.get('/api/get-user-nfts/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const result = await pool.query('SELECT * FROM nfts WHERE owner_address = $1', [walletAddress]);
    res.json(result.rows);
  } catch (error) {
    console.error('사용자 NFT 조회 오류:', error.message);
    res.status(500).json({ error: '사용자 NFT 조회 중 오류 발생' });
  }
});

// Pinata API 키 설정
const PINATA_API_KEY = 'bb635b4ad896356fe794';
const PINATA_SECRET_API_KEY = 'c3f85d018a4777e2c1e41970b4ee0ae2c9f437ec61b5da12e6ba426c95e734a1';

// API: Pinata에서 마켓 NFT 가져오기
app.get('/api/get-market-nfts-from-pinata', async (req, res) => {
  try {
    const response = await axios.get('https://api.pinata.cloud/data/pinList', {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    const nfts = response.data.rows.map(item => ({
      name: item.metadata.name || '이름 없음',
      image_url: `https://gateway.pinata.cloud/ipfs/${item.ipfs_pin_hash}`,
      price: item.metadata.keyvalues.price || '0',
    }));

    res.status(200).json(nfts);
  } catch (error) {
    console.error('NFT 데이터를 가져오는 중 오류 발생:', error.message);
    res.status(500).json({ error: 'NFT 데이터를 가져오는 데 실패했습니다.' });
  }
});

// 서버 실행
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
