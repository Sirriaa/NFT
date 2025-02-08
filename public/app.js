document.addEventListener('DOMContentLoaded', () => {
    // Web3Modal provider 설정
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider.default,
            options: {
                infuraId: "4c2eccc6dcca4e478ef33fb1efdded45"
            }
        },
        coinbasewallet: {
            package: true,
            options: {
                appName: "NFT Marketplace",
                infuraId: "4c2eccc6dcca4e478ef33fb1efdded45"
            }
        }
    };

    const web3Modal = new Web3Modal.default({
        cacheProvider: false,
        providerOptions
    });

    // 지갑 연결 및 서명 처리
const requestWalletConnection = async () => {
    try {
        const provider = await web3Modal.connect(); // Web3Modal을 통한 지갑 연결
        const web3 = new Web3(provider);
        const accounts = await web3.eth.getAccounts(); // 연결된 계정 가져오기

        if (accounts.length === 0) {
            console.error("지갑에 연결된 계정이 없습니다.");
        } else {
            const from = accounts[0];
            console.log('지갑 주소:', from); // 디버깅: 지갑 주소 로그 출력

            const signature = await web3.eth.personal.sign(
                "NFT Marketplace Authentication", // 서명 메시지
                from, // 서명할 계정
                "" // 비밀번호 (메타마스크에서 관리)
            );
            console.log('서명:', signature); // 디버깅: 서명 로그 출력

            // 로컬 스토리지에 지갑 주소 저장
            localStorage.setItem('userAddress', from);
            
            // UI 업데이트
            updateProfileUI("", from);

            // 서버에 지갑 주소와 서명 저장
            await registerWallet(from, signature);

            // 프로필 저장 (사용자 입력 포함)
            await saveProfile(from);

            // 프로필 정보 가져오기 및 UI 업데이트
            await fetchProfile(from);

            alert("지갑이 연결되었습니다.");
        }
    } catch (error) {
        console.error("지갑 연결 실패: ", error);
    }
};


    // 로그인 상태 확인 및 프로필 정보 가져오기
    async function checkLoginStatus() {
        const userAddress = localStorage.getItem('userAddress');
        if (userAddress) {
            updateProfileUI("이름 없음", userAddress); // 지갑 주소를 UI에 바로 표시
            await fetchProfile(userAddress); // 지갑 주소로 프로필 정보 가져오기
        } else {
            await requestWalletConnection(); // 지갑 연결 요청
        }
    }

    // 지갑 주소 및 서명 저장
    async function registerWallet(walletAddress, signature) {
        console.log('registerWallet 호출됨:', { walletAddress, signature }); // 디버깅 로그
    
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: walletAddress,
                    signature: signature,
                }),
            });
    
            const result = await response.json();
            console.log('서버 응답:', result); // 서버 응답 확인
            if (response.ok) {
                console.log('등록 성공:', result.message);
            } else {
                console.error('등록 실패:', result.error);
            }
        } catch (error) {
            console.error('지갑 등록 중 오류:', error);
        }
    }
    
    
    
    

    // 프로필 UI 업데이트 함수
    function updateProfileUI(username, walletAddress) {
        document.getElementById('username').innerText = username || '이름 없음';
        document.getElementById('walletAddress').innerText = walletAddress || '지갑 주소 없음';
    }

    // 회원가입 시 프로필 저장
    const saveProfile = async (walletAddress) => {
        const username = document.getElementById('usernameInput').value; // 입력 필드에서 값 가져오기
        const bio = document.getElementById('bioInput').value;
        const email = document.getElementById('emailInput').value;
        const link = document.getElementById('linkInput').value;
    
        console.log('저장 요청 데이터:', { username, bio, email, link, walletAddress }); // 디버깅 로그
    
        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    bio,
                    email,
                    link,
                    wallet_address: walletAddress,
                }),
            });
    
            const result = await response.json();
            if (response.ok) {
                console.log('프로필 저장 성공:', result.message);
                alert('프로필 정보가 저장되었습니다.');
            } else {
                console.error('프로필 저장 실패:', result.error);
                alert('프로필 저장 중 문제가 발생했습니다.');
            }
        } catch (error) {
            console.error('프로필 저장 중 오류:', error);
            alert('서버와의 통신 오류가 발생했습니다.');
        }
    };
    

    // 프로필 정보 가져오기
    async function fetchProfile(walletAddress) {
        console.log('fetchProfile 호출됨. 지갑 주소:', walletAddress); // 디버깅 로그
    
        try {
            const response = await fetch(`/api/profile/${walletAddress}`);
            const profileData = await response.json();
    
            if (response.ok && profileData) {
                console.log('프로필 데이터:', profileData); // 프로필 데이터 출력
                updateProfileUI(profileData.username || "이름 없음", walletAddress);
            } else {
                console.error('프로필 정보가 없습니다. 에러 메시지:', profileData.error);
                updateProfileUI("이름 없음", walletAddress);
            }
        } catch (error) {
            console.error('프로필 가져오기 오류:', error);
            updateProfileUI("이름 없음", walletAddress);
        }
    }
    
    

    // 이벤트 리스너 추가
    const loginBtn = document.getElementById('loginBtn');
    const profileLink = document.getElementById('profileLink');
    const settingsLink = document.getElementById('settingsLink');
    const tradeLink = document.getElementById('tradeLink');

    if (loginBtn) {
        loginBtn.addEventListener('click', requestWalletConnection);
    }

    if (profileLink) {
        profileLink.addEventListener('click', (event) => {
            event.preventDefault(); // 기본 동작 방지
            window.location.href = 'Profile.html'; // 프로필 페이지로 이동
        });
    }

    if (settingsLink) {
        settingsLink.addEventListener('click', (event) => {
            event.preventDefault(); // 기본 동작 방지
            window.location.href = 'Setting.html'; // 설정 페이지로 이동
        });
    }

    if (tradeLink) {
        tradeLink.addEventListener('click', async () => {
            await initializeProfile();
            window.location.href = 'trade.html'; // 거래 페이지로 이동
        });
    }

    // 페이지가 로드될 때 로그인 상태 확인 및 지갑 주소 표시
    checkLoginStatus();
});
