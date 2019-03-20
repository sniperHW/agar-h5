#ifdef _CORE_

#include "chk_ud.h"

struct chk_acceptor {
    _chk_handle;
    chk_ud          ud; 
    chk_acceptor_cb cb;
};

#endif